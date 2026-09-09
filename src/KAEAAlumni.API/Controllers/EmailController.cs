using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KAEAAlumni.API.Controllers;

// ── 메일 발송 내역 (Officer/Admin 전용) ────────────────────
// 행사 공지 메일뿐 아니라, 추후 추가될 게시글 알림/가입 인증/비밀번호 재설정 메일도
// 전부 같은 email_batches/email_logs 구조를 쓰므로 이 화면 하나로 시스템에서 나가는
// 모든 메일의 발송 여부와 시각을 조회할 수 있다.
[ApiController]
[Route("api/email")]
[Authorize(Roles = "OFFICER,ADMIN")]
public class EmailController : ControllerBase
{
    private readonly IEmailBatchRepository _batchRepo;
    private readonly IRepository<EmailLog> _logRepo;
    private readonly IEmailQueue _emailQueue;

    public EmailController(IEmailBatchRepository batchRepo, IRepository<EmailLog> logRepo, IEmailQueue emailQueue)
    {
        _batchRepo = batchRepo;
        _logRepo = logRepo;
        _emailQueue = emailQueue;
    }

    // 발송 이력 목록 (종류별 필터, 최신순)
    [HttpGet("batches")]
    public async Task<IActionResult> GetBatches(
        [FromQuery] string? kind, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        EmailKind? emailKind = null;
        if (!string.IsNullOrWhiteSpace(kind) && Enum.TryParse<EmailKind>(kind, true, out var parsed))
            emailKind = parsed;

        var (batches, total) = await _batchRepo.GetPagedAsync(emailKind, page, pageSize);
        var items = batches.Select(b => new EmailBatchDto(
            b.Id, b.Kind.ToString(), b.Target?.ToString(), b.EventId, b.Event?.Title,
            b.Subject, b.RecipientCount, b.SuccessCount, b.FailureCount, b.Status.ToString(),
            b.SentByName, b.CreatedAt, b.CompletedAt
        )).ToList();

        return Ok(new PagedResultDto<EmailBatchDto>(
            items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    // 이번 달 누적 발송 성공 건수 — 무료 SMTP 티어(월 발송 한도) 소진 속도 확인용
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
        => Ok(new { sentThisMonth = await _batchRepo.CountSentThisMonthAsync() });

    // 배치 내 수신자별 상세 (실패 사유 확인용) — 실패 건이 위로 오도록 정렬
    [HttpGet("batches/{id}/logs")]
    public async Task<IActionResult> GetBatchLogs(Guid id)
    {
        var logs = await _logRepo.FindAsync(l => l.BatchId == id);
        var items = logs
            .OrderByDescending(l => l.Status == EmailLogStatus.FAILED)
            .ThenBy(l => l.ToEmail)
            .Select(l => new EmailLogDto(l.Id, l.ToEmail, l.ToName, l.Status.ToString(), l.ErrorMessage, l.SentAt))
            .ToList();
        return Ok(items);
    }

    // 실패한 수신자만 다시 큐에 넣어 재발송
    [HttpPost("batches/{id}/retry-failed")]
    public async Task<IActionResult> RetryFailed(Guid id)
    {
        var batch = await _batchRepo.GetByIdAsync(id);
        if (batch == null) return NotFound();

        var failedLogs = (await _logRepo.FindAsync(l => l.BatchId == id && l.Status == EmailLogStatus.FAILED)).ToList();
        if (failedLogs.Count == 0)
            return Ok(new { message = "재발송할 실패 건이 없습니다.", retryCount = 0 });

        foreach (var log in failedLogs)
        {
            log.Status = EmailLogStatus.PENDING;
            log.ErrorMessage = null;
        }
        await _logRepo.SaveChangesAsync();

        batch.FailureCount -= failedLogs.Count;
        batch.Status = EmailBatchStatus.PENDING;
        batch.CompletedAt = null;
        await _batchRepo.SaveChangesAsync();

        await _emailQueue.EnqueueAsync(id);
        return Ok(new { message = $"{failedLogs.Count}건 재발송을 시작했습니다.", retryCount = failedLogs.Count });
    }
}
