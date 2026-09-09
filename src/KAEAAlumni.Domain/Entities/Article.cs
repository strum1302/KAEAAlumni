using KAEAAlumni.Domain.Common;
using KAEAAlumni.Domain.Enums;

namespace KAEAAlumni.Domain.Entities;

// ── 게시판/공지/아카이브 (articles) ───────────────────────
// NOTICE(공지사항) / STORY(우리 이야기) / FELLOWSHIP(장학기금) / HISTORY(연혁) / FREE(자유게시판)
public class Article : BaseEntity
{
    public ArticleCategory Category { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public int ViewCount { get; set; } = 0;

    // 작성자 회원 ID (본인 글 수정/삭제 권한 판단용). 이 컬럼 추가 이전에 작성된 글은 NULL일 수 있음.
    public Guid? AuthorId { get; set; }

    public ICollection<GalleryItem> GalleryItems { get; set; } = new List<GalleryItem>();
    public ICollection<ArticleComment> Comments { get; set; } = new List<ArticleComment>();
    public ICollection<ArticleLike> Likes { get; set; } = new List<ArticleLike>();
}
