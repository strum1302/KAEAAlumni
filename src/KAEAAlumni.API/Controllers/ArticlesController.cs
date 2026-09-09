using System.Security.Claims;
using KAEAAlumni.Application.DTOs;
using KAEAAlumni.Application.Interfaces;
using KAEAAlumni.Domain.Entities;
using KAEAAlumni.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KAEAAlumni.API.Controllers;

// ── 게시판: 공지사항(Notice) / 우리 이야기(Story) / 자유게시판(Free) /
//    미중서부 장학기금(Fellowship) / 연혁(History) ───────
// 댓글/좋아요는 자유게시판(FREE)·우리 이야기(STORY)에서만 사용 가능 (로그인 회원 전용).
[ApiController]
[Route("api/[controller]")]
public class ArticlesController : ControllerBase
{
    private readonly IArticleRepository _articleRepo;
    private readonly IRepository<ArticleComment> _commentRepo;
    private readonly IRepository<ArticleLike> _likeRepo;

    public ArticlesController(
        IArticleRepository articleRepo,
        IRepository<ArticleComment> commentRepo,
        IRepository<ArticleLike> likeRepo)
    {
        _articleRepo = articleRepo;
        _commentRepo = commentRepo;
        _likeRepo = likeRepo;
    }

    // 댓글/좋아요를 지원하는 카테고리 (회원 간 소통용 게시판)
    private static bool SupportsSocial(ArticleCategory category)
        => category is ArticleCategory.FREE or ArticleCategory.STORY;

    // 이 글을 수정/삭제할 수 있는지: 임원/관리자 또는 작성자 본인
    private bool CanModify(Article article)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role is "OFFICER" or "ADMIN") return true;

        var memberId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return article.AuthorId.HasValue && article.AuthorId.Value == memberId;
    }

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
            a.Id, a.Category.ToString(), a.Title, a.AuthorName, a.AuthorId, a.ViewCount,
            a.Comments.Count, a.Likes.Count, a.CreatedAt
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

        Guid? currentMemberId = null;
        if (User.Identity?.IsAuthenticated == true)
            currentMemberId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var dto = new ArticleDetailDto(
            article.Id, article.Category.ToString(), article.Title, article.Content,
            article.AuthorName, article.AuthorId, article.ViewCount,
            article.Likes.Count,
            currentMemberId.HasValue && article.Likes.Any(l => l.MemberId == currentMemberId.Value),
            article.CreatedAt,
            article.GalleryItems.Select(g => new GalleryItemDto(
                g.Id, g.Title, g.Description, g.MediaType.ToString(), g.MediaUrl,
                g.ThumbnailUrl, g.DisplayOrder, g.ShowOnHome, g.EventId, null, g.ArticleId, g.CreatedAt
            )).ToList(),
            article.Comments.OrderBy(c => c.CreatedAt).Select(c => new ArticleCommentDto(
                c.Id, c.ArticleId, c.MemberId, c.AuthorName, c.Content, c.CreatedAt
            )).ToList()
        );
        return Ok(dto);
    }

    // 공지 작성 (Officer/Admin), 우리 이야기(Story)/자유게시판(Free)는 일반 회원도 작성 가능
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateArticle([FromBody] CreateArticleDto dto)
    {
        if (!Enum.TryParse<ArticleCategory>(dto.Category, true, out var category))
            return BadRequest(new { message = "유효하지 않은 카테고리입니다. (NOTICE, STORY, FREE, FELLOWSHIP, HISTORY)" });

        var role = User.FindFirstValue(ClaimTypes.Role);
        if (category is ArticleCategory.NOTICE or ArticleCategory.FELLOWSHIP or ArticleCategory.HISTORY
            && role is not ("OFFICER" or "ADMIN"))
            return Forbid();

        var article = new Article
        {
            Category = category,
            Title = dto.Title,
            Content = dto.Content,
            AuthorName = dto.AuthorName,
            AuthorId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)
        };
        await _articleRepo.AddAsync(article);
        await _articleRepo.SaveChangesAsync();
        return CreatedAtAction(nameof(GetArticle), new { id = article.Id }, article.Id);
    }

    // 글 수정 - 임원/관리자 또는 작성자 본인
    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateArticle(Guid id, [FromBody] UpdateArticleDto dto)
    {
        var article = await _articleRepo.GetByIdAsync(id);
        if (article == null) return NotFound();
        if (!CanModify(article)) return Forbid();

        article.Title = dto.Title;
        article.Content = dto.Content;
        await _articleRepo.SaveChangesAsync();
        return NoContent();
    }

    // 글 삭제 - 임원/관리자 또는 작성자 본인
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteArticle(Guid id)
    {
        var article = await _articleRepo.GetByIdAsync(id);
        if (article == null) return NotFound();
        if (!CanModify(article)) return Forbid();

        await _articleRepo.DeleteAsync(article);
        await _articleRepo.SaveChangesAsync();
        return NoContent();
    }

    // 댓글 작성 (로그인 회원만, 자유게시판/우리 이야기 게시글에만 허용)
    [Authorize]
    [HttpPost("{id}/comments")]
    public async Task<IActionResult> CreateComment(Guid id, [FromBody] CreateArticleCommentDto dto)
    {
        var article = await _articleRepo.GetByIdAsync(id);
        if (article == null) return NotFound();
        if (!SupportsSocial(article.Category))
            return BadRequest(new { message = "이 게시판에는 댓글을 작성할 수 없습니다." });

        var memberId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var comment = new ArticleComment
        {
            ArticleId = id,
            MemberId = memberId,
            AuthorName = dto.AuthorName,
            Content = dto.Content
        };
        await _commentRepo.AddAsync(comment);
        await _commentRepo.SaveChangesAsync();

        return Ok(new ArticleCommentDto(
            comment.Id, comment.ArticleId, comment.MemberId, comment.AuthorName, comment.Content, comment.CreatedAt));
    }

    // 댓글 삭제 - 작성자 본인 또는 임원/관리자
    [Authorize]
    [HttpDelete("{id}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(Guid id, Guid commentId)
    {
        var comment = await _commentRepo.GetByIdAsync(commentId);
        if (comment == null || comment.ArticleId != id) return NotFound();

        var memberId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (comment.MemberId != memberId && role is not ("OFFICER" or "ADMIN"))
            return Forbid();

        await _commentRepo.DeleteAsync(comment);
        await _commentRepo.SaveChangesAsync();
        return NoContent();
    }

    // 좋아요 토글 (로그인 회원만, 자유게시판/우리 이야기 게시글에만 허용)
    [Authorize]
    [HttpPost("{id}/like")]
    public async Task<IActionResult> ToggleLike(Guid id)
    {
        var article = await _articleRepo.GetByIdAsync(id);
        if (article == null) return NotFound();
        if (!SupportsSocial(article.Category))
            return BadRequest(new { message = "이 게시판에는 좋아요를 사용할 수 없습니다." });

        var memberId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var existing = (await _likeRepo.FindAsync(l => l.ArticleId == id && l.MemberId == memberId)).FirstOrDefault();

        bool liked;
        if (existing != null)
        {
            await _likeRepo.DeleteAsync(existing);
            liked = false;
        }
        else
        {
            await _likeRepo.AddAsync(new ArticleLike { ArticleId = id, MemberId = memberId });
            liked = true;
        }
        await _likeRepo.SaveChangesAsync();

        var likeCount = (await _likeRepo.FindAsync(l => l.ArticleId == id)).Count();
        return Ok(new { liked, likeCount });
    }
}
