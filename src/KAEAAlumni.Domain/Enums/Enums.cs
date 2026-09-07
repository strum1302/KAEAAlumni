namespace KAEAAlumni.Domain.Enums;

// NOTE: These enums are persisted as plain strings (EF Core HasConversion<string>())
// so their member names match the VARCHAR values in db/schema.sql exactly.

// ── 회원 권한 (role) ─────────────────────────────────────
// GUEST(비회원)는 DB에 저장되지 않는 미인증 상태이며, 아래 4가지는 members.role 값.
public enum MemberRole
{
    MEMBER = 0,   // 일반 정회원 (기본값)
    YT = 1,       // Young Tigers (청년 교우)
    OFFICER = 2,  // 교우회 임원진
    ADMIN = 3     // 시스템 최고 관리자
}

// ── 게시판 카테고리 (articles.category) ──────────────────
public enum ArticleCategory
{
    NOTICE = 0,      // 공지사항
    STORY = 1,       // 우리 이야기
    FELLOWSHIP = 2,  // 미중서부 장학기금
    HISTORY = 3,     // 교우회 연혁
    FREE = 4         // 자유게시판
}

// ── 갤러리 미디어 타입 (gallery_items.media_type) ────────
public enum MediaType
{
    PHOTO = 0,
    VIDEO = 1
}

// ── 수납/재정 (payments.payment_type) ────────────────────
public enum PaymentType
{
    MEMBERSHIP_FEE = 0,
    DONATION = 1,
    EVENT_FEE = 2
}

// ── payments.payment_method ──────────────────────────────
public enum PaymentMethod
{
    ZELLE = 0,
    VENMO = 1,
    CHECK = 2,
    CREDIT_CARD = 3,
    CASH = 4
}

// ── payments.payment_status ──────────────────────────────
public enum PaymentStatus
{
    PENDING = 0,
    COMPLETED = 1,
    CANCELLED = 2
}

// ── event_rsvps.payment_status ───────────────────────────
public enum RsvpPaymentStatus
{
    PENDING = 0,
    COMPLETED = 1
}
