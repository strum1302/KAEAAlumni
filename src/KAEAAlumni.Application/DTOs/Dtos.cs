namespace KAEAAlumni.Application.DTOs;

// ── Common ──────────────────────────────────────────────
public record PagedResultDto<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

// ── Event ───────────────────────────────────────────────
public record EventListDto(
    Guid Id,
    string Title,
    DateTime EventDate,
    string Location,
    decimal Fee,
    int MaxAttendees,
    int CurrentAttendees,
    bool IsActive,
    string? GoogleMapsUrl = null
);

public record EventDetailDto(
    Guid Id,
    string Title,
    string? Description,
    DateTime EventDate,
    string Location,
    decimal Fee,
    int MaxAttendees,
    int CurrentAttendees,
    bool IsActive,
    int PhotoCount,
    int VideoCount,
    string? GoogleMapsUrl = null
);

public record CreateEventDto(
    string Title,
    string? Description,
    DateTime EventDate,
    string Location,
    decimal Fee,
    int MaxAttendees,
    string? GoogleMapsUrl = null   // 주소 또는 구글맵 링크 (선택)
);

public record UpdateEventDto(
    string Title,
    string? Description,
    DateTime EventDate,
    string Location,
    decimal Fee,
    int MaxAttendees,
    bool IsActive,
    string? GoogleMapsUrl = null
);

// ── EventRsvp ───────────────────────────────────────────
public record EventRsvpDto(
    Guid Id,
    string GuestName,
    string Email,
    string CellPhone,
    string GraduationInfo,
    int AdditionalGuests,
    string? Note,
    string PaymentStatus,
    DateTime CreatedAt
);

public record CreateEventRsvpDto(
    string GuestName,
    string Email,
    string CellPhone,
    string GraduationInfo,
    int AdditionalGuests,
    string? Note
);

// ── Article (Notice / Story / Fellowship / History) ──────
public record ArticleListDto(
    Guid Id,
    string Category,
    string Title,
    string AuthorName,
    int ViewCount,
    DateTime CreatedAt
);

public record ArticleDetailDto(
    Guid Id,
    string Category,
    string Title,
    string Content,
    string AuthorName,
    int ViewCount,
    DateTime CreatedAt,
    List<GalleryItemDto> GalleryItems
);

public record CreateArticleDto(
    string Category,
    string Title,
    string Content,
    string AuthorName
);

public record UpdateArticleDto(
    string Title,
    string Content
);

// ── GalleryItem ───────────────────────────────────────────
public record GalleryItemDto(
    Guid Id,
    string Title,
    string? Description,
    string MediaType,
    string MediaUrl,
    string? ThumbnailUrl,
    int DisplayOrder,
    Guid? EventId,
    string? EventTitle,
    Guid? ArticleId,
    DateTime CreatedAt
);

public record CreateGalleryItemDto(
    string Title,
    string? Description,
    string MediaType,      // "PHOTO" | "VIDEO"
    string MediaUrl,
    string? ThumbnailUrl,
    Guid? EventId,
    Guid? ArticleId,
    int DisplayOrder = 0   // 낮을수록 먼저 표시 (예: 교가는 0)
);

public record UpdateGalleryItemOrderDto(
    int DisplayOrder
);

// ── Payment ─────────────────────────────────────────────
public record PaymentDto(
    Guid Id,
    DateTime PaymentDate,
    Guid MemberId,
    string MemberName,
    string GraduationInfo,
    string PaymentType,
    int TargetYear,
    decimal Amount,
    string PaymentMethod,
    string? TransactionId,
    string? PurposeDetail,
    string PaymentStatus,
    bool ReceiptIssued
);

public record CreatePaymentDto(
    Guid MemberId,
    string PaymentType,
    int TargetYear,
    decimal Amount,
    string PaymentMethod,
    DateTime? PaymentDate,
    string? TransactionId,
    string? PurposeDetail,
    bool ReceiptIssued
);

public record UpdatePaymentDto(
    decimal Amount,
    string PaymentMethod,
    string? TransactionId,
    string? PurposeDetail,
    string PaymentStatus,
    bool ReceiptIssued
);

public record PaymentSummaryDto(
    int Year,
    decimal TotalAmount,
    decimal MembershipFeeTotal,
    decimal DonationTotal,
    decimal EventFeeTotal
);
