import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { articlesApi } from '../api'
import { useAuthStore } from '../store/authStore'
import ArticleContent from '../components/common/ArticleContent'
import type { ArticleDetail } from '../types'

export default function ArticleDetailPage() {
  const { category, id } = useParams<{ category: string; id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { member, isAuthenticated } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)

  const { data: article, refetch } = useQuery({
    queryKey: ['article', id],
    queryFn: async () => (await articlesApi.getById(id!)).data as ArticleDetail,
    enabled: !!id,
  })

  if (!article) return <p className="text-sm text-gray-400">불러오는 중...</p>

  // 임원/관리자는 모든 글을, 작성자 본인은 자신의 글을 수정/삭제할 수 있습니다.
  const canModify = !!member && (member.role === 'OFFICER' || member.role === 'ADMIN' || article.authorId === member.id)
  // 댓글/좋아요는 자유게시판·우리 이야기 게시글에서만 사용할 수 있습니다.
  const canSocial = article.category === 'FREE' || article.category === 'STORY'

  const startEditing = () => {
    setEditForm({ title: article.title, content: article.content })
    setEditing(true)
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await articlesApi.update(article.id, editForm)
      toast.success('수정되었습니다.')
      setEditing(false)
      refetch()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('이 글을 삭제하시겠습니까?')
    if (!confirmed) return
    setDeleting(true)
    try {
      await articlesApi.delete(article.id)
      toast.success('삭제되었습니다.')
      navigate(`/community/${category}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '삭제에 실패했습니다.')
      setDeleting(false)
    }
  }

  const toggleLike = async () => {
    setLikeBusy(true)
    try {
      await articlesApi.toggleLike(article.id)
      refetch()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '처리에 실패했습니다.')
    } finally {
      setLikeBusy(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !member) return
    setPostingComment(true)
    try {
      const authorName = `${member.name} (${member.entryYear} ${member.major})`
      await articlesApi.addComment(article.id, { authorName, content: commentText })
      setCommentText('')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '댓글 등록에 실패했습니다.')
    } finally {
      setPostingComment(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    const confirmed = window.confirm('이 댓글을 삭제하시겠습니까?')
    if (!confirmed) return
    try {
      await articlesApi.deleteComment(article.id, commentId)
      refetch()
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/community/${category}`} className="text-sm text-crimson hover:underline">&larr; 목록으로</Link>

      {!editing ? (
        <>
          <div className="flex items-start justify-between mt-3 mb-2 gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{article.title}</h1>
            {canModify && (
              <div className="flex gap-2 shrink-0 pt-1">
                <button onClick={startEditing} className="text-xs text-crimson font-medium hover:underline">
                  수정
                </button>
                <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-500 hover:underline disabled:opacity-50">
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-400 mb-6">
            {article.authorName} · {format(new Date(article.createdAt), 'yyyy.MM.dd')} · 조회 {article.viewCount}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-sm text-gray-700 leading-relaxed">
            <ArticleContent content={article.content} />
          </div>
        </>
      ) : (
        <form onSubmit={saveEdit} className="mt-3 space-y-3 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <input required value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <textarea required rows={8} value={editForm.content}
            onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="bg-crimson text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-crimson-800 disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
              취소
            </button>
          </div>
        </form>
      )}

      {article.galleryItems.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-gray-800 mb-3">첨부 미디어</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {article.galleryItems.map((g) => (
              <div key={g.id} className="rounded-xl overflow-hidden bg-gray-100">
                {g.mediaType === 'PHOTO' ? (
                  <img src={g.mediaUrl} alt={g.title} loading="lazy" className="w-full aspect-video object-cover" />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center bg-gray-800 text-white text-sm">▶ {g.title}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {canSocial && (
        <>
          {/* 좋아요 */}
          <div className="mt-6">
            <button
              onClick={toggleLike}
              disabled={!isAuthenticated || likeBusy}
              title={!isAuthenticated ? '로그인 후 이용해주세요' : undefined}
              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                article.likedByMe
                  ? 'bg-crimson text-white border-crimson'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              ♥ 좋아요 {article.likeCount}
            </button>
          </div>

          {/* 댓글 */}
          <div className="mt-8">
            <h2 className="font-bold text-gray-800 mb-3">댓글 {article.comments.length}</h2>
            <div className="space-y-3 mb-4">
              {article.comments.map((c) => (
                <div key={c.id} className="bg-white border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{c.authorName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{format(new Date(c.createdAt), 'yyyy.MM.dd HH:mm')}</span>
                      {member && (member.id === c.memberId || member.role === 'OFFICER' || member.role === 'ADMIN') && (
                        <button onClick={() => deleteComment(c.id)} className="text-xs text-red-400 hover:text-red-500">
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
              {!article.comments.length && <p className="text-sm text-gray-400">등록된 댓글이 없습니다.</p>}
            </div>

            {isAuthenticated ? (
              <form onSubmit={submitComment} className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="댓글을 입력하세요"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <button type="submit" disabled={postingComment || !commentText.trim()}
                  className="bg-crimson text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-crimson-800 disabled:opacity-50">
                  등록
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-400">댓글을 작성하려면 로그인해주세요.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
