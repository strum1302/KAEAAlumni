using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace KAEAAlumni.API.Controllers;

// ── 전체 교우 명부/권한 관리 (Admin Console) ──────────────
[ApiController]
[Route("api/[controller]")]
public class MembersController : ControllerBase
{
    private readonly IMemberRepository _memberRepo;

    public MembersController(IMemberRepository memberRepo)
        => _memberRepo = memberRepo;

    // 내 정보 조회 (마이페이지)
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var member = await _memberRepo.GetByIdAsync(id);
        if (member == null) return NotFound();

        return Ok(new MemberDto(
            member.Id, member.Name, member.Email, member.EntryYear, member.Major,
            member.Degree, member.CellPhone, member.HomePhone, member.AddressLine1,
            member.AddressLine2, member.City, member.State, member.ZipCode,
            member.Bio, member.Role.ToString(), member.OfficerTitle, member.PhotoUrl));
    }

    // 내 정보 수정
    [Authorize]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateMemberProfileDto dto)
    {
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var member = await _memberRepo.GetByIdAsync(id);
        if (member == null) return NotFound();

        member.CellPhone = dto.CellPhone;
        member.HomePhone = dto.HomePhone;
        member.AddressLine1 = dto.AddressLine1;
        member.AddressLine2 = dto.AddressLine2;
        member.City = dto.City;
        member.State = dto.State;
        member.ZipCode = dto.ZipCode;
        member.Bio = dto.Bio;

        await _memberRepo.SaveChangesAsync();
        return NoContent();
    }

    // 내 비밀번호 변경 - 현재 비밀번호 확인 후 새 비밀번호로 교체
    [Authorize]
    [HttpPut("me/password")]
    public async Task<IActionResult> ChangeMyPassword([FromBody] ChangePasswordDto dto)
    {
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var member = await _memberRepo.GetByIdAsync(id);
        if (member == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, member.PasswordHash))
            return BadRequest(new { message = "현재 비밀번호가 올바르지 않습니다." });

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
            return BadRequest(new { message = "새 비밀번호는 8자 이상이어야 합니다." });

        member.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _memberRepo.SaveChangesAsync();
        return Ok(new { message = "비밀번호가 변경되었습니다." });
    }

    // 전체 회원 목록 (Officer/Admin) - includeInactive=true 시 등록 취소된 회원도 함께 조회
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpGet]
    public async Task<IActionResult> GetAllMembers([FromQuery] bool includeInactive = false)
    {
        var members = await _memberRepo.GetAllAsync();
        var result = members
            .Where(m => includeInactive || m.IsActive)
            .Select(m => new
            {
                m.Id, m.Name, m.Email, m.EntryYear, m.Major, m.Degree,
                m.City, m.State, Role = m.Role.ToString(), m.OfficerTitle, m.IsActive, m.PhotoUrl, m.CreatedAt
            });
        return Ok(result);
    }

    // 임원진 목록 (공개 - 교우회 소개 페이지) - 활성 회원만 노출
    [HttpGet("officers")]
    public async Task<IActionResult> GetOfficers()
    {
        var officers = await _memberRepo.FindAsync(
            m => m.OfficerTitle != null && m.OfficerTitle != "" && m.IsActive);
        var result = officers.Select(m => new
        {
            m.Id, m.Name, m.EntryYear, m.Major, m.OfficerTitle, m.PhotoUrl
        });
        return Ok(result);
    }

    // 회원 권한 변경 (Admin 전용)
    [Authorize(Roles = "ADMIN")]
    [HttpPut("{id}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateMemberRoleDto dto)
    {
        var member = await _memberRepo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("회원을 찾을 수 없습니다.");

        if (!Enum.TryParse<MemberRole>(dto.Role, true, out var role))
            return BadRequest(new { message = "유효하지 않은 권한입니다. (MEMBER, YT, OFFICER, ADMIN)" });

        member.Role = role;
        await _memberRepo.SaveChangesAsync();
        return Ok(new { message = $"{member.Name} 님의 권한이 {role}(으)로 변경되었습니다." });
    }

    // 임원 직책 변경 (Admin 전용) - 빈 문자열/null 전달 시 직책 해제
    [Authorize(Roles = "ADMIN")]
    [HttpPut("{id}/officer-title")]
    public async Task<IActionResult> UpdateOfficerTitle(Guid id, [FromBody] UpdateMemberOfficerTitleDto dto)
    {
        var member = await _memberRepo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("회원을 찾을 수 없습니다.");

        member.OfficerTitle = string.IsNullOrWhiteSpace(dto.OfficerTitle) ? null : dto.OfficerTitle.Trim();
        await _memberRepo.SaveChangesAsync();
        return Ok(new { message = $"{member.Name} 님의 직책이 변경되었습니다." });
    }

    // 회원 등록 취소 / 재등록 (Admin 전용) - 실제로 삭제하지 않고 is_active만 변경 (soft delete)
    // 비활성 회원은 로그인이 차단되고, 임원진/기본 목록에서는 제외됩니다.
    [Authorize(Roles = "ADMIN")]
    [HttpPut("{id}/active")]
    public async Task<IActionResult> UpdateActive(Guid id, [FromBody] UpdateMemberActiveDto dto)
    {
        var currentId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == currentId && !dto.IsActive)
            return BadRequest(new { message = "본인 계정은 이 화면에서 비활성화할 수 없습니다." });

        var member = await _memberRepo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("회원을 찾을 수 없습니다.");

        member.IsActive = dto.IsActive;
        await _memberRepo.SaveChangesAsync();

        var message = dto.IsActive
            ? $"{member.Name} 님이 다시 활성화되었습니다."
            : $"{member.Name} 님의 등록이 취소되었습니다.";
        return Ok(new { message });
    }

    // 프로필 사진 등록/변경 (Admin 전용) - PhotoUrl이 비어있으면 사진 제거
    [Authorize(Roles = "ADMIN")]
    [HttpPut("{id}/photo")]
    public async Task<IActionResult> UpdatePhoto(Guid id, [FromBody] UpdateMemberPhotoDto dto)
    {
        var member = await _memberRepo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("회원을 찾을 수 없습니다.");

        member.PhotoUrl = string.IsNullOrWhiteSpace(dto.PhotoUrl) ? null : dto.PhotoUrl;
        await _memberRepo.SaveChangesAsync();
        return Ok(new { message = $"{member.Name} 님의 사진이 업데이트되었습니다." });
    }
}
