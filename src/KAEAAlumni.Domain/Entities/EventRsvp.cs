using KAEAAlumni.Domain.Common;
using KAEAAlumni.Domain.Enums;

namespace KAEAAlumni.Domain.Entities;

// ── 행사 RSVP 참가 신청 (event_rsvps) ────────────────────
// 비회원도 신청 가능 (MemberId Nullable, ON DELETE SET NULL) — 성명/연락처 직접 입력
public class EventRsvp : BaseEntity
{
    public Guid EventId { get; set; }
    public Event Event { get; set; } = null!;

    public Guid? MemberId { get; set; }
    public Member? Member { get; set; }

    public string GuestName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string CellPhone { get; set; } = string.Empty;
    public string GraduationInfo { get; set; } = string.Empty;  // 학번/과 (예: "83 전산학과")
    public int AdditionalGuests { get; set; } = 0;
    public string? Note { get; set; }
    public RsvpPaymentStatus PaymentStatus { get; set; } = RsvpPaymentStatus.PENDING;
}
