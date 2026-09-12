using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace KAEAAlumni.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
        => _authService = authService;

    // 신입 교우 명부 등록 (회원가입)
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var result = await _authService.RegisterAsync(dto);
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.LoginAsync(dto);
        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto)
    {
        var result = await _authService.RefreshTokenAsync(dto.RefreshToken);
        return Ok(result);
    }

    // 이메일 인증(참고용) - 인증하지 않아도 로그인/사이트 이용에는 제한이 없습니다.
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
    {
        await _authService.VerifyEmailAsync(dto.Token);
        return Ok(new { message = "이메일 인증이 완료되었습니다." });
    }

    // 인증 메일 재전송 (로그인한 본인)
    [Authorize]
    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification()
    {
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _authService.ResendVerificationEmailAsync(id);
        return Ok(new { message = "인증 메일을 다시 보냈습니다." });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var memberId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
        var name = User.FindFirstValue(ClaimTypes.Name);
        var role = User.FindFirstValue(ClaimTypes.Role);
        return Ok(new { memberId, email, name, role });
    }
}
