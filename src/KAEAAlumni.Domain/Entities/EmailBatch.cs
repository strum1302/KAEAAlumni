using KAEAAlumni.Domain.Common;
using KAEAAlumni.Domain.Enums;

namespace KAEAAlumni.Domain.Entities;

// ── 메일 발송 이력 (한 번의 발송 "행위" = 배치 1건) ────────
// 지금은 행사 공지(EVENT_NOTIFY)만 실제로 사용하지만, 게시글 알림/가입 인증/
// 비밀번호 재설정 등도 같은 구조로 이력을 남길 수 있도록 Kind를 범용으로 둠
// (수신자가 1명뿐인 인증 메일도 배치 1건 + 로그 1건으로 취급).
public class EmailBatch : BaseEntity
{
    public EmailKind Kind { get; set; }
    public EmailTarget? Target { get; set; }   // 행사 공지일 때만 사용 (ALL/RSVP/NOT_RSVP)

    public Guid? EventId { get; set; }
    public Event? Event { get; set; }
    public Guid? ArticleId { get; set; }
    public Article? Article { get; set; }

    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    public int RecipientCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public EmailBatchStatus Status { get; set; } = EmailBatchStatus.PENDING;

    // 발송을 지시한 임원. 회원이 탈퇴해도 이력에는 이름이 남도록 스냅샷도 함께 저장.
    public Guid? SentBy { get; set; }
    public Member? SentByMember { get; set; }
    public string? SentByName { get; set; }

    public DateTime? CompletedAt { get; set; }

    public ICollection<EmailLog> Logs { get; set; } = new List<EmailLog>();
}
