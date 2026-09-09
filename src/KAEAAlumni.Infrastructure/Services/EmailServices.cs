using System.Net;
using System.Net.Mail;
using System.Threading.Channels;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace KAEAAlumni.Infrastructure.Services;

// ── SMTP 발송 (무료 SMTP 서비스, 예: SMTP2GO) ─────────────
// appsettings.json / Railway 환경변수의 Smtp:* 키를 읽어 System.Net.Mail로 1통씩 발송한다.
// (별도 NuGet 패키지 없이 .NET 기본 라이브러리만 사용 — 구현체를 SMTP2GO API/Amazon SES 등
//  다른 방식으로 바꾸더라도 IEmailSender를 쓰는 나머지 코드는 손댈 필요가 없다.)
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;

    public SmtpEmailSender(IConfiguration config) => _config = config;

    public async Task SendAsync(
        string toEmail,
        string? toName,
        string subject,
        string body,
        CancellationToken cancellationToken = default)
    {
        var host = _config["Smtp:Host"]
            ?? throw new InvalidOperationException("Smtp:Host가 설정되지 않았습니다. (Railway 환경변수 Smtp__Host 확인)");
        var port = int.Parse(_config["Smtp:Port"] ?? "587");
        var username = _config["Smtp:Username"];
        var password = _config["Smtp:Password"];
        var enableSsl = bool.Parse(_config["Smtp:EnableSsl"] ?? "true");
        var fromEmail = _config["Smtp:FromEmail"]
            ?? throw new InvalidOperationException("Smtp:FromEmail이 설정되지 않았습니다. (Railway 환경변수 Smtp__FromEmail 확인)");
        var fromName = _config["Smtp:FromName"] ?? "고려대학교 미중서부 교우회";

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            Credentials = string.IsNullOrEmpty(username) ? null : new NetworkCredential(username, password),
        };

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false,
        };
        message.To.Add(string.IsNullOrWhiteSpace(toName) ? new MailAddress(toEmail) : new MailAddress(toEmail, toName));

        // SmtpClient.SendMailAsync(MailMessage)에는 CancellationToken 오버로드가 없어
        // 호출 직전에만 취소 여부를 확인한다 (발송 자체를 중간에 끊지는 못함).
        cancellationToken.ThrowIfCancellationRequested();
        await client.SendMailAsync(message);
    }
}

// ── 인메모리 발송 큐 ───────────────────────────────────────
// Railway 단일 인스턴스 배포를 전제로 한 프로세스 내 큐. 배포/재시작 시 대기 중이던
// 배치는 유실되지만(테이블 status가 PENDING/SENDING으로 남음), 관리자가 "메일 발송 내역"
// 화면에서 실패/미완료 배치를 확인하고 재시도할 수 있다. 인스턴스를 여러 개로 늘리면
// DB 폴링 등 별도 큐로 교체가 필요하다.
public class InMemoryEmailQueue : IEmailQueue
{
    private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>();

    public ValueTask EnqueueAsync(Guid batchId, CancellationToken cancellationToken = default)
        => _channel.Writer.WriteAsync(batchId, cancellationToken);

    public IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken cancellationToken)
        => _channel.Reader.ReadAllAsync(cancellationToken);
}

// ── 백그라운드 발송 처리기 ─────────────────────────────────
// 큐에서 배치 ID를 하나씩 꺼내, 그 배치의 PENDING 로그를 순회하며 1통씩 발송한다.
// (BCC로 한 번에 묶어 보내지 않는 이유: 수신자별 성공/실패를 email_logs에 개별 기록하기 위함.)
public class EmailDispatchService : BackgroundService
{
    private readonly IEmailQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailDispatchService> _logger;

    public EmailDispatchService(IEmailQueue queue, IServiceScopeFactory scopeFactory, ILogger<EmailDispatchService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var batchId in _queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await ProcessBatchAsync(batchId, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "이메일 배치 {BatchId} 처리 중 오류가 발생했습니다.", batchId);
            }
        }
    }

    private async Task ProcessBatchAsync(Guid batchId, CancellationToken ct)
    {
        // BackgroundService는 싱글턴이라 스코프 서비스(DbContext 기반 리포지토리)는
        // 배치 1건을 처리할 때마다 새 스코프를 만들어서 가져와야 한다.
        using var scope = _scopeFactory.CreateScope();
        var batchRepo = scope.ServiceProvider.GetRequiredService<IEmailBatchRepository>();
        var logRepo = scope.ServiceProvider.GetRequiredService<IRepository<EmailLog>>();
        var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        var batch = await batchRepo.GetByIdAsync(batchId);
        if (batch == null) return;

        batch.Status = EmailBatchStatus.SENDING;
        await batchRepo.SaveChangesAsync();

        var logs = (await logRepo.FindAsync(l => l.BatchId == batchId && l.Status == EmailLogStatus.PENDING)).ToList();

        foreach (var log in logs)
        {
            log.AttemptCount++;
            try
            {
                await sender.SendAsync(log.ToEmail, log.ToName, batch.Subject, batch.Body, ct);
                log.Status = EmailLogStatus.SENT;
                log.SentAt = DateTime.UtcNow;
                batch.SuccessCount++;
            }
            catch (Exception ex)
            {
                log.Status = EmailLogStatus.FAILED;
                log.ErrorMessage = ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
                batch.FailureCount++;
            }
            // 한 통씩 저장 — 중간에 프로세스가 죽어도 이미 처리한 건은 재발송 대상에서 빠진다.
            await logRepo.SaveChangesAsync();
        }

        batch.Status = batch.FailureCount > 0 ? EmailBatchStatus.COMPLETED_WITH_ERRORS : EmailBatchStatus.COMPLETED;
        batch.CompletedAt = DateTime.UtcNow;
        await batchRepo.SaveChangesAsync();
    }
}
