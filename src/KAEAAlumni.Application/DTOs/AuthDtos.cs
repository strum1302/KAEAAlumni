namespace KAEAAlumni.Application.DTOs;

// ── 신입 교우 명부 등록 (Join) ────────────────────────────
public record RegisterDto(
    string Name,
    string Email,
    string Password,
    int EntryYear,
    string Major,
    string Degree,          // "학사" | "석사" | "박사"
    string CellPhone,
    string? HomePhone,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string State,
    string? ZipCode,
    string? Bio
);

public record LoginDto(
    string Email,
    string Password
);

public record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    MemberDto Member
);

public record MemberDto(
    Guid Id,
    string Name,
    string Email,
    int EntryYear,
    string Major,
    string Degree,
    string CellPhone,
    string? HomePhone,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string State,
    string? ZipCode,
    string? Bio,
    string Role
);

public record RefreshTokenDto(string RefreshToken);

public record UpdateMemberRoleDto(string Role);

public record UpdateMemberProfileDto(
    string CellPhone,
    string? HomePhone,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string State,
    string? ZipCode,
    string? Bio
);
