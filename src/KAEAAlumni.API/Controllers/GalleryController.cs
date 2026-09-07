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
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24)
    {
        MediaType? type = null;
        if (!string.IsNullOrWhiteSpace(mediaType) &&
            Enum.TryParse<MediaType>(mediaType, true, out var parsed))
            type = parsed;

        var (items, total) = await _galleryRepo.GetPagedAsync(type, eventId, articleId, page, pageSize);
        var dtos = items.Select(g => new GalleryItemDto(
            g.Id, g.Title, g.Description, g.MediaType.ToString(), g.MediaUrl,
            g.ThumbnailUrl, g.DisplayOrder, g.EventId, g.Event?.Title, g.ArticleId, g.CreatedAt
        )).ToList();

        return Ok(new PagedResultDto<GalleryItemDto>(
            dtos, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
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
            DisplayOrder = dto.DisplayOrder
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
