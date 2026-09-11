using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KAEAAlumni.API.Controllers;

// ── 미디어 갤러리 (Gallery: 전체보기 / 사진 / 영상) ───────
[ApiController]
[Route("api/[controller]")]
public class GalleryController : ControllerBase
{
    private readonly IGalleryItemRepository _galleryRepo;

    public GalleryController(IGalleryItemRepository galleryRepo)
        => _galleryRepo = galleryRepo;

    [HttpGet]
    public async Task<IActionResult> GetItems(
        [FromQuery] string? mediaType,
        [FromQuery] Guid? eventId,
        [FromQuery] Guid? articleId,
        [FromQuery] bool? hasEvent,
        [FromQuery] int? year,
        [FromQuery] bool? showOnHome,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        // 목록(그리드)에서는 사진마다 풀사이즈 base64를 다 실어 보내면 갤러리 초기 로딩이
        // 느려지므로, 기본값(false)에서는 사진에 썸네일이 있으면 그걸로 대신 실어 보낸다.
        // 실제로 크게 볼 때(라이트박스)만 full=true로 다시 요청하거나 GET /gallery/{id}로
        // 원본 화질을 따로 받아온다.
        [FromQuery] bool full = false)
    {
        MediaType? type = null;
        if (!string.IsNullOrWhiteSpace(mediaType) &&
            Enum.TryParse<MediaType>(mediaType, true, out var parsed))
            type = parsed;

        var (items, total) = await _galleryRepo.GetPagedAsync(type, eventId, articleId, page, pageSize, hasEvent, year, showOnHome, category);
        var dtos = items.Select(g => new GalleryItemDto(
            g.Id, g.Title, g.Description, g.MediaType.ToString(),
            (!full && g.MediaType == MediaType.PHOTO && !string.IsNullOrEmpty(g.ThumbnailUrl)) ? g.ThumbnailUrl! : g.MediaUrl,
            g.ThumbnailUrl, g.DisplayOrder, g.ShowOnHome, g.EventId, g.Event?.Title, g.ArticleId, g.CreatedAt, g.Category
        )).ToList();

        return Ok(new PagedResultDto<GalleryItemDto>(
            dtos, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    // 연도 드롭다운용 — 실제 미디어가 등록되어 있는 연도 목록(최신순, 등록일 기준)
    [HttpGet("years")]
    public async Task<IActionResult> GetYears()
        => Ok(await _galleryRepo.GetDistinctYearsAsync());

    // 목록에서 썸네일(축소본)만 받은 사진을 실제로 클릭해서 크게 볼 때, 원본 화질을 따로 받아온다.
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetItem(Guid id)
    {
        var item = await _galleryRepo.GetByIdAsync(id);
        if (item == null) return NotFound();

        return Ok(new GalleryItemDto(
            item.Id, item.Title, item.Description, item.MediaType.ToString(), item.MediaUrl,
            item.ThumbnailUrl, item.DisplayOrder, item.ShowOnHome, item.EventId, item.Event?.Title, item.ArticleId, item.CreatedAt, item.Category
        ));
    }

    // 행사/게시글 하부 사진·영상 업로드 (Officer/Admin)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpPost]
    public async Task<IActionResult> CreateItem([FromBody] CreateGalleryItemDto dto)
    {
        if (!Enum.TryParse<MediaType>(dto.MediaType, true, out var mediaType))
            return BadRequest(new { message = "유효하지 않은 미디어 타입입니다. (PHOTO, VIDEO)" });

        var item = new GalleryItem
        {
            Title = dto.Title,
            Description = dto.Description,
            MediaType = mediaType,
            MediaUrl = dto.MediaUrl,
            ThumbnailUrl = dto.ThumbnailUrl,
            EventId = dto.EventId,
            ArticleId = dto.ArticleId,
            DisplayOrder = dto.DisplayOrder,
            ShowOnHome = dto.ShowOnHome,
            Category = dto.Category
        };
        await _galleryRepo.AddAsync(item);
        await _galleryRepo.SaveChangesAsync();
        return Ok(new { id = item.Id });
    }

    // 정렬 순서 변경 (예: 교가를 맨 앞으로 고정)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpPut("{id}/order")]
    public async Task<IActionResult> UpdateOrder(Guid id, [FromBody] UpdateGalleryItemOrderDto dto)
    {
        var item = await _galleryRepo.GetByIdAsync(id);
        if (item == null) return NotFound();

        item.DisplayOrder = dto.DisplayOrder;
        await _galleryRepo.SaveChangesAsync();
        return Ok(new { message = "정렬 순서가 변경되었습니다." });
    }

    // 홈페이지 노출 여부 변경 (체크 해제 시 홈페이지 목록에서만 숨김, 갤러리 전체보기에는 계속 노출)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpPut("{id}/visibility")]
    public async Task<IActionResult> UpdateVisibility(Guid id, [FromBody] UpdateGalleryItemVisibilityDto dto)
    {
        var item = await _galleryRepo.GetByIdAsync(id);
        if (item == null) return NotFound();

        item.ShowOnHome = dto.ShowOnHome;
        await _galleryRepo.SaveChangesAsync();
        return Ok(new { message = dto.ShowOnHome ? "홈페이지에 표시됩니다." : "홈페이지에서 숨김 처리되었습니다." });
    }

    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteItem(Guid id)
    {
        var item = await _galleryRepo.GetByIdAsync(id);
        if (item == null) return NotFound();

        await _galleryRepo.DeleteAsync(item);
        await _galleryRepo.SaveChangesAsync();
        return NoContent();
    }
}
