using KAEAAlumni.Domain.Common;
using KAEAAlumni.Domain.Enums;

namespace KAEAAlumni.Domain.Entities;

// ── 게시판/공지/아카이브 (articles) ───────────────────────
// NOTICE(공지사항) / STORY(우리 이야기) / FELLOWSHIP(장학기금) / HISTORY(연혁)
public class Article : BaseEntity
{
    public ArticleCategory Category { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public int ViewCount { get; set; } = 0;

    public ICollection<GalleryItem> GalleryItems { get; set; } = new List<GalleryItem>();
}
