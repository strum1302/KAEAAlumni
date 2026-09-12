using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Domain.Entities;

namespace KAEAAlumni.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> RefreshTokenAsync(string refreshToken);
    Task VerifyEmailAsync(string token);
    Task ResendVerificationEmailAsync(Guid memberId);
    string GenerateAccessToken(Member member);
    string GenerateRefreshToken();
}

public interface ITokenService
{
    string GenerateAccessToken(Member member);
    string GenerateRefreshToken();
    Guid? GetMemberIdFromToken(string token);
}

public interface IPaymentService
{
    Task<PaymentSummaryDto> GetYearlySummaryAsync(int year);
}
