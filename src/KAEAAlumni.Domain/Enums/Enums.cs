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
    FELLOWSHIP = 2,  // 미중서부 후원
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
    MEMBERSHIP_FEE = 0,        // 연회비 ($100)
    DONATION = 1,
    EVENT_FEE = 2,
    MEMBERSHIP_FEE_BOARD = 3,  // 연회비+이사회비 ($200)
    // 연회비/이사회비/도네이션/행사비가 뒤섞여 있어 항목별로 나누기 어려운 과거(예전) 자료를
    // 한 번에 일괄 등록할 때 쓰는 통합 항목. payment_type 컬럼은 VARCHAR라 새 값 추가에
    // DB 스키마 변경은 필요 없다(HasConversion<string>()).
    GENERAL = 4
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

// ── 메일 발송 이력 (email_batches.kind) ──────────────────
// 지금은 EVENT_NOTIFY(행사 공지)만 실제로 발송되지만, 추후 게시글 알림/가입 인증/
// 비밀번호 재설정 등도 같은 이력 구조를 그대로 쓸 수 있도록 종류를 미리 넉넉히 둠.
public enum EmailKind
{
    EVENT_NOTIFY = 0,
    ARTICLE_NOTIFY = 1,
    SIGNUP_VERIFY = 2,
    PASSWORD_RESET = 3,
    MANUAL = 4,
    NEW_MEMBER_ADMIN_NOTIFY = 5   // 신규 회원 가입 시 관리자/임원진에게 자동 발송
}

// ── 행사 공지 메일 발송 대상 (email_batches.target) ──────
public enum EmailTarget
{
    ALL = 0,       // 전체 회원
    RSVP = 1,      // 해당 행사 신청자만 (회원+게스트)
    NOT_RSVP = 2   // 해당 행사 미신청 회원만
}

// ── email_batches.status ─────────────────────────────────
public enum EmailBatchStatus
{
    PENDING = 0,
    SENDING = 1,
    COMPLETED = 2,
    COMPLETED_WITH_ERRORS = 3
}

// ── email_logs.status ─────────────────────────────────────
public enum EmailLogStatus
{
    PENDING = 0,
    SENT = 1,
    FAILED = 2
}
