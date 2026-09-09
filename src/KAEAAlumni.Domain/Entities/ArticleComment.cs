using KAEAAlumni.Domain.Common;

namespace KAEAAlumni.Domain.Entities;

// ── 게시글 댓글 (article_comments) ─────────────────────────
// 자유게시판(FREE)/우리 이야기(STORY) 게시글에만 사용 (그 외 카테고리는 API에서 차단).
// 로그인한 회원만 작성 가능하며, MemberId 외에 작성 시점의 "이름 (입학연도 학과)" 표시명을
// AuthorName에 스냅샷으로 저장합니다 (게시글 작성자 표시 방식과 동일).
public class ArticleComment : BaseEntity
{
    public Guid ArticleId { get; set; }
    public Article? Article { get; set; }

    public Guid MemberId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}
