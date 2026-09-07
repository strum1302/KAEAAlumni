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
            member.Bio, member.Role.ToString()));
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

    // 전체 회원 목록 (Officer/Admin)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpGet]
    public async Task<IActionResult> GetAllMembers()
    {
        var members = await _memberRepo.GetAllAsync();
        var result = members.Select(m => new
        {
            m.Id, m.Name, m.Email, m.EntryYear, m.Major, m.Degree,
            m.City, m.State, Role = m.Role.ToString(), m.CreatedAt
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
}
