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

// ── Article (Notice / Story / Fellowship / History / Free) ──
public record ArticleListDto(
    Guid Id,
    string Category,
    string Title,
    string AuthorName,
    Guid? AuthorId,
    int ViewCount,
    int CommentCount,
    int LikeCount,
    DateTime CreatedAt
);

public record ArticleDetailDto(
    Guid Id,
    string Category,
    string Title,
    string Content,
    string AuthorName,
    Guid? AuthorId,
    int ViewCount,
    int LikeCount,
    bool LikedByMe,
    DateTime CreatedAt,
    List<GalleryItemDto> GalleryItems,
    List<ArticleCommentDto> Comments
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

// ── ArticleComment (자유게시판/우리 이야기 전용) ──────────
public record ArticleCommentDto(
    Guid Id,
    Guid ArticleId,
    Guid MemberId,
    string AuthorName,
    string Content,
    DateTime CreatedAt
);

public record CreateArticleCommentDto(
    string AuthorName,
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
    bool ShowOnHome,
    Guid? EventId,
    string? EventTitle,
    Guid? ArticleId,
    DateTime CreatedAt,
    string? Category = null
);

public record CreateGalleryItemDto(
    string Title,
    string? Description,
    string MediaType,      // "PHOTO" | "VIDEO"
    string MediaUrl,
    string? ThumbnailUrl,
    Guid? EventId,
    Guid? ArticleId,
    int DisplayOrder = 0,   // 낮을수록 먼저 표시 (예: 교가는 0)
    bool ShowOnHome = true, // false면 갤러리 전체 목록에만 노출되고 홈페이지 목록에서는 제외됨
    string? Category = null // 행사와 무관한 항목일 때만 사용: "SCHOOL_SONG" | "CAMPUS"
);

public record UpdateGalleryItemOrderDto(
    int DisplayOrder
);

public record UpdateGalleryItemVisibilityDto(
    bool ShowOnHome
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
    Guid MemberId,
    string PaymentType,
    int TargetYear,
    decimal Amount,
    string PaymentMethod,
    DateTime? PaymentDate,
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

// ── 비밀번호 변경 (본인) ────────────────────────────────
public record ChangePasswordDto(
    string CurrentPassword,
    string NewPassword
);

// ── 메일 발송 이력 (Email) ──────────────────────────────
public record SendEventNotifyDto(
    string Target,   // ALL | RSVP | NOT_RSVP
    string Subject,
    string Body
);

public record EmailBatchDto(
    Guid Id,
    string Kind,
    string? Target,
    Guid? EventId,
    string? EventTitle,
    string Subject,
    int RecipientCount,
    int SuccessCount,
    int FailureCount,
    string Status,
    string? SentByName,
    DateTime CreatedAt,
    DateTime? CompletedAt
);

public record EmailLogDto(
    Guid Id,
    string ToEmail,
    string? ToName,
    string Status,
    string? ErrorMessage,
    DateTime? SentAt
);
