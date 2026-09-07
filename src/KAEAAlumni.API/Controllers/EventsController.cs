using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KAEAAlumni.API.Controllers;

// ── 행사 및 모임 (Events) ─────────────────────────────────
[ApiController]
[Route("api/[controller]")]
public class EventsController : ControllerBase
{
    private readonly IEventRepository _eventRepo;
    private readonly IEventRsvpRepository _rsvpRepo;

    public EventsController(IEventRepository eventRepo, IEventRsvpRepository rsvpRepo)
    {
        _eventRepo = eventRepo;
        _rsvpRepo = rsvpRepo;
    }

    // 연간 행사 일정 목록
    [HttpGet]
    public async Task<IActionResult> GetEvents(
        [FromQuery] bool? upcomingOnly,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var (events, total) = await _eventRepo.GetPagedAsync(upcomingOnly, page, pageSize);
        var items = events.Select(e => new EventListDto(
            e.Id, e.Title, e.EventDate, e.Location, e.Fee, e.MaxAttendees,
            e.Rsvps?.Sum(r => 1 + r.AdditionalGuests) ?? 0, e.IsActive, e.GoogleMapsUrl
        )).ToList();

        return Ok(new PagedResultDto<EventListDto>(
            items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    // 행사 상세 (참가 신청 폼 + 하부 미디어 갤러리 포함 화면에서 사용)
    [HttpGet("{id}")]
    public async Task<IActionResult> GetEvent(Guid id)
    {
        var ev = await _eventRepo.GetWithDetailsAsync(id);
        if (ev == null) return NotFound();

        var dto = new EventDetailDto(
            ev.Id, ev.Title, ev.Description, ev.EventDate, ev.Location, ev.Fee,
            ev.MaxAttendees, ev.Rsvps?.Sum(r => 1 + r.AdditionalGuests) ?? 0, ev.IsActive,
            ev.GalleryItems?.Count(g => g.MediaType == Domain.Enums.MediaType.PHOTO) ?? 0,
            ev.GalleryItems?.Count(g => g.MediaType == Domain.Enums.MediaType.VIDEO) ?? 0,
            ev.GoogleMapsUrl
        );
        return Ok(dto);
    }

    // 행사 개설 (Officer/Admin)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventDto dto)
    {
        var ev = new Event
        {
            Title = dto.Title,
            Description = dto.Description,
            EventDate = dto.EventDate,
            Location = dto.Location,
            GoogleMapsUrl = dto.GoogleMapsUrl,
            Fee = dto.Fee,
            MaxAttendees = dto.MaxAttendees
        };
        await _eventRepo.AddAsync(ev);
        await _eventRepo.SaveChangesAsync();
        return CreatedAtAction(nameof(GetEvent), new { id = ev.Id }, ev.Id);
    }

    // 행사 수정 (Officer/Admin)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventDto dto)
    {
        var ev = await _eventRepo.GetByIdAsync(id);
        if (ev == null) return NotFound();

        ev.Title = dto.Title;
        ev.Description = dto.Description;
        ev.EventDate = dto.EventDate;
        ev.Location = dto.Location;
        ev.GoogleMapsUrl = dto.GoogleMapsUrl;
        ev.Fee = dto.Fee;
        ev.MaxAttendees = dto.MaxAttendees;
        ev.IsActive = dto.IsActive;

        await _eventRepo.SaveChangesAsync();
        return NoContent();
    }

    // 행사 삭제 (Officer/Admin)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEvent(Guid id)
    {
        var ev = await _eventRepo.GetByIdAsync(id);
        if (ev == null) return NotFound();

        await _eventRepo.DeleteAsync(ev);
        await _eventRepo.SaveChangesAsync();
        return NoContent();
    }

    // ── RSVP ──────────────────────────────────────────────

    // 참가자(RSVP) 명단 조회 (Officer/Admin)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpGet("{id}/rsvps")]
    public async Task<IActionResult> GetRsvps(Guid id)
    {
        var rsvps = await _rsvpRepo.GetByEventIdAsync(id);
        var items = rsvps.Select(r => new EventRsvpDto(
            r.Id, r.GuestName, r.Email, r.CellPhone, r.GraduationInfo,
            r.AdditionalGuests, r.Note, r.PaymentStatus.ToString(), r.CreatedAt
        )).ToList();
        return Ok(items);
    }

    // 온라인 참가 신청 (비회원도 가능 — GUEST/MEMBER/YT/OFFICER/ADMIN 모두 허용)
    [HttpPost("{id}/rsvps")]
    public async Task<IActionResult> CreateRsvp(Guid id, [FromBody] CreateEventRsvpDto dto)
    {
        var ev = await _eventRepo.GetByIdAsync(id);
        if (ev == null) return NotFound();

        Guid? memberId = null;
        var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (idClaim != null && Guid.TryParse(idClaim.Value, out var parsed))
            memberId = parsed;

        var rsvp = new EventRsvp
        {
            EventId = id,
            MemberId = memberId,
            GuestName = dto.GuestName,
            Email = dto.Email,
            CellPhone = dto.CellPhone,
            GraduationInfo = dto.GraduationInfo,
            AdditionalGuests = dto.AdditionalGuests,
            Note = dto.Note
        };

        await _rsvpRepo.AddAsync(rsvp);
        await _rsvpRepo.SaveChangesAsync();
        return Ok(new { message = "참가 신청이 완료되었습니다.", id = rsvp.Id });
    }
}
