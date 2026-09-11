using System.Threading.Channels;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace KAEAAlumni.Infrastructure.Services;

// ── SMTP 발송 (Brevo 등 무료/유료 SMTP 서비스) ─────────────
// appsettings.json / Railway 환경변수의 Smtp:* 키를 읽어 1통씩 발송한다.
// MailKit을 쓰는 이유: .NET 기본 System.Net.Mail.SmtpClient는 마이크로소프트가 유지보수를
// 최소화 모드로 전환한 지 오래됐고, 특히 Linux(예: Railway 컨테이너)에서 STARTTLS를 쓰는
// 서버(Brevo, SendGrid 등)와 통신할 때 원인을 알 수 없는 "Failure sending mail." 같은
// 뭉뚱그려진 실패를 내는 경우가 흔히 보고된다. MailKit은 크로스플랫폼 STARTTLS/SSL 처리가
// 안정적이고 실패 시 실제 SMTP 응답 코드/사유가 그대로 예외 메시지에 담겨 나온다.
// (구현체를 다른 방식으로 바꾸더라도 IEmailSender를 쓰는 나머지 코드는 손댈 필요가 없다.)
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

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(string.IsNullOrWhiteSpace(toName) ? MailboxAddress.Parse(toEmail) : new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        // 465 포트는 처음부터 SSL로 접속(SslOnConnect)하고, 587(또는 그 외) 포트는
        // 연결 후 STARTTLS로 전환하는 방식(StartTls)을 쓴다 — Brevo는 587/StartTls.
        var socketOptions = port == 465
            ? SecureSocketOptions.SslOnConnect
            : enableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None;

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, socketOptions, cancellationToken);
        if (!string.IsNullOrEmpty(username))
            await client.AuthenticateAsync(username, password, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
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
                // SmtpClient는 "Failure sending mail." 같은 의미 없는 상위 메시지만 던지고
                // 실제 원인(인증 실패, 연결 거부 등)은 InnerException에 들어있는 경우가 많아
                // 함께 기록한다. 여러 겹으로 감싸져 있을 수 있어 가장 안쪽까지 따라간다.
                var detail = ex.Message;
                var inner = ex.InnerException;
                while (inner != null)
                {
                    detail += " | inner: " + inner.Message;
                    inner = inner.InnerException;
                }
                log.ErrorMessage = detail.Length > 500 ? detail[..500] : detail;
                _logger.LogWarning(ex, "이메일 발송 실패: batch={BatchId} to={ToEmail}", batch.Id, log.ToEmail);
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
