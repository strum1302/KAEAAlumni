using KAEAAlumni.Domain.Common;
using KAEAAlumni.Domain.Enums;

namespace KAEAAlumni.Domain.Entities;

// ── 회원 (members) ──────────────────────────────────────
// db/schema.sql 1번 테이블과 1:1 매핑. 휴대전화/일반전화 분리, 미국 주소 체계.
public class Member : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string CellPhone { get; set; } = string.Empty;
    public string? HomePhone { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string State { get; set; } = "IL";
    public string? ZipCode { get; set; }
    public int EntryYear { get; set; }
    public string Major { get; set; } = string.Empty;
    public string Degree { get; set; } = "학사";   // 학사/석사/박사 — schema stores plain text
    public MemberRole Role { get; set; } = MemberRole.MEMBER;
    public string? Bio { get; set; }               // 교우회 메모
    public string? OfficerTitle { get; set; }      // 임원 직책 (회장/부회장/총무/회계/YT회장 등, 없으면 null)
    public bool IsActive { get; set; } = true;     // false = 등록 취소(soft delete). 실제 행은 삭제하지 않음.
    public string? PhotoUrl { get; set; }          // 프로필 사진 (base64 data URL 또는 외부 이미지 URL). 없으면 null.

    // ── 이메일 인증(참고용) ──
    // 인증하지 않아도 로그인/사이트 이용에는 제한이 없는 "참고용" 인증입니다. 관리자 화면에서
    // 미인증 회원을 확인할 수 있도록 상태만 표시합니다. 토큰은 인증 완료 시 null로 비웁니다.
    public bool EmailVerified { get; set; } = false;
    public string? EmailVerificationToken { get; set; }

    // ── 인증(auth) 확장 컬럼 ──
    // schema.sql의 members 테이블에는 없는 컬럼입니다. ASP.NET Core 자체 JWT 로그인을
    // 구현하려면 비밀번호/리프레시 토큰 저장소가 필요해 추가했습니다 (db/schema.sql 하단 주석 참고).
    public string PasswordHash { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    // Navigation
    public ICollection<EventRsvp> EventRsvps { get; set; } = new List<EventRsvp>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
