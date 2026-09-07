using KAEAAlumni.Domain.Common;
using KAEAAlumni.Domain.Enums;

namespace KAEAAlumni.Domain.Entities;

// ── 미디어 갤러리 (gallery_items) ─────────────────────────
// 사진/영상 구분, 행사(Event) 또는 게시글(Article) 하부 종속 등록 가능 (둘 다 Nullable)
public class GalleryItem : BaseEntity
{
    public Guid? EventId { get; set; }
    public Event? Event { get; set; }

    public Guid? ArticleId { get; set; }
    public Article? Article { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public MediaType MediaType { get; set; }
    public string MediaUrl { get; set; } = string.Empty;   // 이미지 원본 URL 또는 YouTube 링크
    public string? ThumbnailUrl { get; set; }
    public int DisplayOrder { get; set; } = 0;
}
