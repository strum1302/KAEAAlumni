using KAEAAlumni.Domain.Common;

namespace KAEAAlumni.Domain.Entities;

// ── 게시글 좋아요 (article_likes) ───────────────────────────
// 자유게시판(FREE)/우리 이야기(STORY) 게시글에만 사용 (그 외 카테고리는 API에서 차단).
// 로그인한 회원만 사용 가능. (article_id, member_id) 조합에 DB unique 제약이 있어
// 회원 1명당 게시글 1개에 좋아요 1개만 가능하며, 토글(추가/취소) 방식으로 동작합니다.
public class ArticleLike : BaseEntity
{
    public Guid ArticleId { get; set; }
    public Article? Article { get; set; }

    public Guid MemberId { get; set; }
}
