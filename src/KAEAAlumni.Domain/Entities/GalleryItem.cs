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

    // 홈페이지 "최근 행사 미디어"/"고대 자료실"/"학교 갤러리" 목록 노출 여부. false여도 갤러리 전체 목록에는 계속 노출됨.
    public bool ShowOnHome { get; set; } = true;

    // 행사와 무관한(EventId == null) 항목을 다시 세분화하기 위한 분류.
    // "SCHOOL_SONG"(교가/응원가 등), "CAMPUS"(캠퍼스 사진) 중 하나이거나, 미분류 시 null.
    public string? Category { get; set; }
}
