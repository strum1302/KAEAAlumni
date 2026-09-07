using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace KAEAAlumni.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IMemberRepository _memberRepo;
    private readonly IConfiguration _config;

    public AuthService(IMemberRepository memberRepo, IConfiguration config)
    {
        _memberRepo = memberRepo;
        _config = config;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        if (await _memberRepo.EmailExistsAsync(dto.Email))
            throw new InvalidOperationException("이미 등록된 이메일입니다.");

        var member = new Member
        {
            Name = dto.Name,
            Email = dto.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            EntryYear = dto.EntryYear,
            Major = dto.Major,
            Degree = dto.Degree,
            CellPhone = dto.CellPhone,
            HomePhone = dto.HomePhone,
            AddressLine1 = dto.AddressLine1,
            AddressLine2 = dto.AddressLine2,
            City = dto.City,
            State = string.IsNullOrWhiteSpace(dto.State) ? "IL" : dto.State,
            ZipCode = dto.ZipCode,
            Bio = dto.Bio,
            Role = MemberRole.MEMBER
        };

        member.RefreshToken = GenerateRefreshToken();
        member.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);

        await _memberRepo.AddAsync(member);
        await _memberRepo.SaveChangesAsync();

        return BuildAuthResponse(member);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var member = await _memberRepo.GetByEmailAsync(dto.Email.ToLower())
            ?? throw new UnauthorizedAccessException("이메일 또는 비밀번호가 올바르지 않습니다.");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, member.PasswordHash))
            throw new UnauthorizedAccessException("이메일 또는 비밀번호가 올바르지 않습니다.");

        member.RefreshToken = GenerateRefreshToken();
        member.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        await _memberRepo.SaveChangesAsync();

        return BuildAuthResponse(member);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
    {
        var members = await _memberRepo.FindAsync(m => m.RefreshToken == refreshToken);
        var member = members.FirstOrDefault()
            ?? throw new UnauthorizedAccessException("유효하지 않은 리프레시 토큰입니다.");

        if (member.RefreshTokenExpiry < DateTime.UtcNow)
            throw new UnauthorizedAccessException("리프레시 토큰이 만료되었습니다.");

        member.RefreshToken = GenerateRefreshToken();
        member.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        await _memberRepo.SaveChangesAsync();

        return BuildAuthResponse(member);
    }

    public string GenerateAccessToken(Member member)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, member.Id.ToString()),
            new Claim(ClaimTypes.Email, member.Email),
            new Claim(ClaimTypes.Name, member.Name),
            new Claim(ClaimTypes.Role, member.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(
                int.Parse(_config["Jwt:ExpiryMinutes"] ?? "1440")),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    private AuthResponseDto BuildAuthResponse(Member member) => new(
        AccessToken: GenerateAccessToken(member),
        RefreshToken: member.RefreshToken!,
        Member: new MemberDto(
            member.Id, member.Name, member.Email, member.EntryYear, member.Major,
            member.Degree, member.CellPhone, member.HomePhone, member.AddressLine1,
            member.AddressLine2, member.City, member.State, member.ZipCode,
            member.Bio, member.Role.ToString()
        )
    );
}
