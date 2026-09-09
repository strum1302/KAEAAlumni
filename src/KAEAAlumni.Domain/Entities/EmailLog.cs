using KAEAAlumni.Domain.Common;
using KAEAAlumni.Domain.Enums;

namespace KAEAAlumni.Domain.Entities;

// ── 메일 발송 이력 (수신자 1명 = 1건) ──────────────────────
// 100명에게 보내면 이 테이블에 100행이 생기고, 각 행이 개별적으로 SMTP 발송/재시도됩니다.
public class EmailLog : BaseEntity
{
    public Guid BatchId { get; set; }
    public EmailBatch? Batch { get; set; }

    public Guid? MemberId { get; set; }   // 게스트 RSVP 수신자는 null
    public Member? Member { get; set; }

    public string ToEmail { get; set; } = string.Empty;
    public string? ToName { get; set; }

    public EmailLogStatus Status { get; set; } = EmailLogStatus.PENDING;
    public string? ErrorMessage { get; set; }
    public int AttemptCount { get; set; }

    public DateTime? SentAt { get; set; }
}
