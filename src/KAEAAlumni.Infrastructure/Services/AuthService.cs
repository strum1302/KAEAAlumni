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
    private readonly IEmailBatchRepository _batchRepo;
    private readonly IRepository<EmailLog> _logRepo;
    private readonly IEmailQueue _emailQueue;

    public AuthService(
        IMemberRepository memberRepo,
        IConfiguration config,
        IEmailBatchRepository batchRepo,
        IRepository<EmailLog> logRepo,
        IEmailQueue emailQueue)
    {
        _memberRepo = memberRepo;
        _config = config;
        _batchRepo = batchRepo;
        _logRepo = logRepo;
        _emailQueue = emailQueue;
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
            Role = MemberRole.MEMBER,
            EmailVerified = false,
            EmailVerificationToken = Guid.NewGuid().ToString("N")
        };

        member.RefreshToken = GenerateRefreshToken();
        member.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);

        await _memberRepo.AddAsync(member);
        await _memberRepo.SaveChangesAsync();

        // 가입 즉시 로그인 응답을 늦추지 않도록, 인증 메일(참고용)과 관리자 알림 메일은
        // EmailDispatchService 백그라운드 큐로 넘긴다. 여기서 실패해도(예: Brevo 설정 누락)
        // 회원가입 자체는 이미 커밋되었으므로 흐름을 막지 않는다.
        try
        {
            await EnqueueVerificationEmailAsync(member);
            await EnqueueAdminNotifyEmailAsync(member);
        }
        catch
        {
            // 메일 발송 준비(배치/로그 생성) 자체가 실패해도 가입 자체는 성공으로 처리한다.
            // 실제 발송 성패는 "메일 발송 내역" 화면에서 별도로 확인/재시도한다.
        }

        return BuildAuthResponse(member);
    }

    public async Task VerifyEmailAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException("유효하지 않은 인증 링크입니다.");

        var candidates = await _memberRepo.FindAsync(m => m.EmailVerificationToken == token);
        var member = candidates.FirstOrDefault()
            ?? throw new InvalidOperationException("유효하지 않거나 이미 사용된 인증 링크입니다.");

        member.EmailVerified = true;
        member.EmailVerificationToken = null;
        await _memberRepo.SaveChangesAsync();
    }

    public async Task ResendVerificationEmailAsync(Guid memberId)
    {
        var member = await _memberRepo.GetByIdAsync(memberId)
            ?? throw new InvalidOperationException("회원을 찾을 수 없습니다.");

        if (member.EmailVerified)
            throw new InvalidOperationException("이미 인증된 이메일입니다.");

        member.EmailVerificationToken = Guid.NewGuid().ToString("N");
        await _memberRepo.SaveChangesAsync();

        await EnqueueVerificationEmailAsync(member);
    }

    // CORS와 같은 Frontend:Url 설정(콤마로 여러 origin 나열 가능)에서 링크에 쓸 첫 번째
    // origin 하나만 뽑아 쓴다.
    private string GetFrontendUrl()
        => (_config["Frontend:Url"] ?? "http://localhost:5173")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault() ?? "http://localhost:5173";

    // 인증 메일(참고용) — 배치 1건 + 로그 1건으로 만들어 "메일 발송 내역" 화면에도 남긴다.
    private async Task EnqueueVerificationEmailAsync(Member member)
    {
        var link = $"{GetFrontendUrl()}/verify-email?token={member.EmailVerificationToken}";
        var batch = new EmailBatch
        {
            Kind = EmailKind.SIGNUP_VERIFY,
            Subject = "[고려대학교 미중서부 교우회] 이메일 인증을 완료해주세요",
            Body =
                $"{member.Name} 님, 안녕하세요.\n\n" +
                "고려대학교 미중서부 교우회(KAEA) 교우 명부 등록을 환영합니다.\n\n" +
                "아래 링크를 클릭하시면 이메일 인증이 완료됩니다 (인증하지 않으셔도 사이트 이용에는 제한이 없습니다):\n\n" +
                $"{link}\n\n" +
                "감사합니다.\n고려대학교 미중서부 교우회",
            RecipientCount = 1,
            SentByName = "시스템(자동발송)",
        };
        await _batchRepo.AddAsync(batch);
        await _batchRepo.SaveChangesAsync();

        await _logRepo.AddAsync(new EmailLog
        {
            BatchId = batch.Id,
            MemberId = member.Id,
            ToEmail = member.Email,
            ToName = member.Name,
        });
        await _logRepo.SaveChangesAsync();

        await _emailQueue.EnqueueAsync(batch.Id);
    }

    // 신규 가입 관리자 알림 — 활성 상태의 임원(OFFICER)/관리자(ADMIN) 전원에게 발송.
    private async Task EnqueueAdminNotifyEmailAsync(Member newMember)
    {
        var admins = (await _memberRepo.FindAsync(
                m => m.IsActive && (m.Role == MemberRole.ADMIN || m.Role == MemberRole.OFFICER)))
            .Where(m => !string.IsNullOrWhiteSpace(m.Email))
            .ToList();

        if (admins.Count == 0) return; // 알릴 관리자/임원이 없으면 조용히 넘어간다.

        var batch = new EmailBatch
        {
            Kind = EmailKind.NEW_MEMBER_ADMIN_NOTIFY,
            Subject = $"[고려대학교 미중서부 교우회] 신규 교우 명부 등록: {newMember.Name}",
            Body =
                "새로운 교우님이 명부에 등록하셨습니다.\n\n" +
                $"성명: {newMember.Name}\n" +
                $"이메일: {newMember.Email}\n" +
                $"학번(입학년도): {newMember.EntryYear}\n" +
                $"학과: {newMember.Major}\n" +
                $"학위: {newMember.Degree}\n" +
                $"휴대전화: {newMember.CellPhone}\n\n" +
                $"관리자 페이지에서 확인해주세요: {GetFrontendUrl()}/admin/members",
            RecipientCount = admins.Count,
            SentByName = "시스템(자동발송)",
        };
        await _batchRepo.AddAsync(batch);
        await _batchRepo.SaveChangesAsync();

        foreach (var admin in admins)
        {
            await _logRepo.AddAsync(new EmailLog
            {
                BatchId = batch.Id,
                MemberId = admin.Id,
                ToEmail = admin.Email,
                ToName = admin.Name,
            });
        }
        await _logRepo.SaveChangesAsync();

        await _emailQueue.EnqueueAsync(batch.Id);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var member = await _memberRepo.GetByEmailAsync(dto.Email.ToLower())
            ?? throw new UnauthorizedAccessException("이메일 또는 비밀번호가 올바르지 않습니다.");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, member.PasswordHash))
            throw new UnauthorizedAccessException("이메일 또는 비밀번호가 올바르지 않습니다.");

        if (!member.IsActive)
            throw new UnauthorizedAccessException("등록이 취소된 계정입니다. 교우회 관리자에게 문의해주세요.");

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

        if (!member.IsActive)
            throw new UnauthorizedAccessException("등록이 취소된 계정입니다. 교우회 관리자에게 문의해주세요.");

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
            new Claim(ClaimTypes.Role, member.Role.ToString()),
            // 회계 담당(임원 직책 "회계")은 관리자가 아니어도 회비 수납 등록 권한이 필요해
            // 토큰에 직책을 함께 담아 PaymentsController에서 확인합니다.
            new Claim("OfficerTitle", member.OfficerTitle ?? "")
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
            member.Bio, member.Role.ToString(), member.OfficerTitle, member.PhotoUrl,
            member.EmailVerified
        )
    );
}
