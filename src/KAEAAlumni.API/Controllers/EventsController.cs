using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
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
    private readonly IMemberRepository _memberRepo;
    private readonly IEmailBatchRepository _batchRepo;
    private readonly IRepository<EmailLog> _logRepo;
    private readonly IEmailQueue _emailQueue;

    public EventsController(
        IEventRepository eventRepo,
        IEventRsvpRepository rsvpRepo,
        IMemberRepository memberRepo,
        IEmailBatchRepository batchRepo,
        IRepository<EmailLog> logRepo,
        IEmailQueue emailQueue)
    {
        _eventRepo = eventRepo;
        _rsvpRepo = rsvpRepo;
        _memberRepo = memberRepo;
        _batchRepo = batchRepo;
        _logRepo = logRepo;
        _emailQueue = emailQueue;
    }

    // 연간 행사 일정 목록
    [HttpGet]
    public async Task<IActionResult> GetEvents(
        [FromQuery] bool? upcomingOnly,
        [FromQuery] int? year,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var (events, total) = await _eventRepo.GetPagedAsync(upcomingOnly, page, pageSize, year);
        var items = events.Select(e => new EventListDto(
            e.Id, e.Title, e.EventDate, e.Location, e.Fee, e.MaxAttendees,
            e.Rsvps?.Sum(r => 1 + r.AdditionalGuests) ?? 0, e.IsActive, e.GoogleMapsUrl
        )).ToList();

        return Ok(new PagedResultDto<EventListDto>(
            items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    // 연도 드롭다운용 — 실제 행사가 등록되어 있는 연도 목록(최신순)
    [HttpGet("years")]
    public async Task<IActionResult> GetYears()
        => Ok(await _eventRepo.GetDistinctYearsAsync());

    // 행사 상세 (참가 신청 폼 + 하부 미디어 갤러리 포함 화면에서 사용)
    [HttpGet("{id:guid}")]
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
        if (ev.EventDate < DateTime.UtcNow)
            return BadRequest(new { message = "이미 지난 행사는 수정할 수 없습니다." });

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
        if (ev.EventDate < DateTime.UtcNow)
            return BadRequest(new { message = "이미 지난 행사는 삭제할 수 없습니다." });

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

    // ── 참가자 공지 메일 발송 (Officer/Admin) ────────────────
    // 실제 SMTP 발송은 백그라운드 큐에서 처리된다. 여기서는 배치 + 수신자별 로그를
    // 만들고 큐에 등록한 뒤 즉시 202로 응답한다 (수십~수백 통을 동기로 보내면 타임아웃 발생).
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpPost("{id}/notify")]
    public async Task<IActionResult> NotifyParticipants(Guid id, [FromBody] SendEventNotifyDto dto)
    {
        var ev = await _eventRepo.GetByIdAsync(id);
        if (ev == null) return NotFound();

        if (!Enum.TryParse<EmailTarget>(dto.Target, true, out var target))
            return BadRequest(new { message = "유효하지 않은 발송 대상입니다." });
        if (string.IsNullOrWhiteSpace(dto.Subject) || string.IsNullOrWhiteSpace(dto.Body))
            return BadRequest(new { message = "제목과 본문을 입력해주세요." });

        // 수신자 조립은 반드시 서버에서 한다. 프론트가 이메일 주소 목록을 그대로 보내는
        // 구조로 만들면 요청을 조작해 임의 주소로 발송할 수 있게 되므로, 프론트는 target
        // 값만 넘기고 실제 수신자는 여기서 DB를 조회해서 정한다.
        var recipients = new List<(Guid? MemberId, string Email, string? Name)>();

        if (target == EmailTarget.ALL)
        {
            var members = await _memberRepo.FindAsync(m => m.IsActive);
            recipients.AddRange(members
                .Where(m => !string.IsNullOrWhiteSpace(m.Email))
                .Select(m => ((Guid?)m.Id, m.Email, (string?)m.Name)));
        }
        else
        {
            var rsvps = await _rsvpRepo.GetByEventIdAsync(id);

            if (target == EmailTarget.RSVP)
            {
                // RSVP는 게스트도 신청할 수 있어 회원 여부와 무관하게 신청서에 입력된
                // 이메일로 보낸다. 같은 주소로 중복 신청했을 수 있어 이메일 기준으로 중복 제거.
                recipients.AddRange(rsvps
                    .Where(r => !string.IsNullOrWhiteSpace(r.Email))
                    .GroupBy(r => r.Email.Trim().ToLower())
                    .Select(g => g.First())
                    .Select(r => (r.MemberId, r.Email, (string?)r.GuestName)));
            }
            else // NOT_RSVP — 이 행사에 신청 이력이 없는 활동 회원만 (게스트는 대상에서 제외)
            {
                var rsvpMemberIds = rsvps.Where(r => r.MemberId.HasValue).Select(r => r.MemberId!.Value).ToHashSet();
                var members = await _memberRepo.FindAsync(m => m.IsActive);
                recipients.AddRange(members
                    .Where(m => !string.IsNullOrWhiteSpace(m.Email) && !rsvpMemberIds.Contains(m.Id))
                    .Select(m => ((Guid?)m.Id, m.Email, (string?)m.Name)));
            }
        }

        if (recipients.Count == 0)
            return BadRequest(new { message = "발송 대상이 없습니다." });

        var memberIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        Guid? sentBy = Guid.TryParse(memberIdClaim, out var sentByGuid) ? sentByGuid : null;
        var sentByName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;

        var batch = new EmailBatch
        {
            Kind = EmailKind.EVENT_NOTIFY,
            Target = target,
            EventId = id,
            Subject = dto.Subject,
            Body = dto.Body,
            RecipientCount = recipients.Count,
            SentBy = sentBy,
            SentByName = sentByName,
        };
        await _batchRepo.AddAsync(batch);
        await _batchRepo.SaveChangesAsync();

        foreach (var r in recipients)
        {
            await _logRepo.AddAsync(new EmailLog
            {
                BatchId = batch.Id,
                MemberId = r.MemberId,
                ToEmail = r.Email,
                ToName = r.Name,
            });
        }
        await _logRepo.SaveChangesAsync();

        await _emailQueue.EnqueueAsync(batch.Id);

        return Accepted(new { batchId = batch.Id, recipientCount = recipients.Count });
    }
}
