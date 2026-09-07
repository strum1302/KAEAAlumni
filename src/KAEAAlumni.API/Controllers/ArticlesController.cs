using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KAEAAlumni.API.Controllers;

// ── 커뮤니티: 공지사항(Notice) / 우리 이야기(Story) /
//    미중서부 장학기금(Fellowship) / 연혁(History) ───────
[ApiController]
[Route("api/[controller]")]
public class ArticlesController : ControllerBase
{
    private readonly IArticleRepository _articleRepo;

    public ArticlesController(IArticleRepository articleRepo)
        => _articleRepo = articleRepo;

    [HttpGet]
    public async Task<IActionResult> GetArticles(
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        ArticleCategory? cat = null;
        if (!string.IsNullOrWhiteSpace(category) &&
            Enum.TryParse<ArticleCategory>(category, true, out var parsed))
            cat = parsed;

        var (articles, total) = await _articleRepo.GetPagedAsync(cat, page, pageSize);
        var items = articles.Select(a => new ArticleListDto(
            a.Id, a.Category.ToString(), a.Title, a.AuthorName, a.ViewCount, a.CreatedAt
        )).ToList();

        return Ok(new PagedResultDto<ArticleListDto>(
            items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetArticle(Guid id)
    {
        var article = await _articleRepo.GetWithGalleryAsync(id);
        if (article == null) return NotFound();

        article.ViewCount++;
        await _articleRepo.SaveChangesAsync();

        var dto = new ArticleDetailDto(
            article.Id, article.Category.ToString(), article.Title, article.Content,
            article.AuthorName, article.ViewCount, article.CreatedAt,
            article.GalleryItems.Select(g => new GalleryItemDto(
                g.Id, g.Title, g.Description, g.MediaType.ToString(), g.MediaUrl,
                g.ThumbnailUrl, g.DisplayOrder, g.EventId, null, g.ArticleId, g.CreatedAt
            )).ToList()
        );
        return Ok(dto);
    }

    // 공지 작성 (Officer/Admin), 우리 이야기(Story)는 일반 회원도 작성 가능
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateArticle([FromBody] CreateArticleDto dto)
    {
        if (!Enum.TryParse<ArticleCategory>(dto.Category, true, out var category))
            return BadRequest(new { message = "유효하지 않은 카테고리입니다. (NOTICE, STORY, FELLOWSHIP, HISTORY)" });

        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (category is ArticleCategory.NOTICE or ArticleCategory.FELLOWSHIP or ArticleCategory.HISTORY
            && role is not ("OFFICER" or "ADMIN"))
            return Forbid();

        var article = new Article
        {
            Category = category,
            Title = dto.Title,
            Content = dto.Content,
            AuthorName = dto.AuthorName
        };
        await _articleRepo.AddAsync(article);
        await _articleRepo.SaveChangesAsync();
        return CreatedAtAction(nameof(GetArticle), new { id = article.Id }, article.Id);
    }

    // 글 수정 (Officer/Admin 전용 - 연혁/공지 등 관리용)
    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateArticle(Guid id, [FromBody] UpdateArticleDto dto)
    {
        var article = await _articleRepo.GetByIdAsync(id);
        if (article == null) return NotFound();

        article.Title = dto.Title;
        article.Content = dto.Content;
        await _articleRepo.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "OFFICER,ADMIN")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteArticle(Guid id)
    {
        var article = await _articleRepo.GetByIdAsync(id);
        if (article == null) return NotFound();

        await _articleRepo.DeleteAsync(article);
        await _articleRepo.SaveChangesAsync();
        return NoContent();
    }
}
