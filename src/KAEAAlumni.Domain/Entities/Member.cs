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
