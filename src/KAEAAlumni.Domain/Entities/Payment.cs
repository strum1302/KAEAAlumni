using KAEAAlumni.Domain.Common;
using KAEAAlumni.Domain.Enums;

namespace KAEAAlumni.Domain.Entities;

// ── 회비/도네이션 수납 (payments) ─────────────────────────
public class Payment : BaseEntity
{
    public Guid MemberId { get; set; }
    public Member Member { get; set; } = null!;

    public PaymentType PaymentType { get; set; }
    public int TargetYear { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.COMPLETED;
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow.Date;
    public string? TransactionId { get; set; }     // Zelle 확인번호 / Check No.
    public string? PurposeDetail { get; set; }      // 후원 목적 세부
    public bool ReceiptIssued { get; set; } = false;
    public string? Note { get; set; }
}
