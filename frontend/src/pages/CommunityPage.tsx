import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { articlesApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { fileToResizedDataUrl } from '../utils/image'
import Pagination from '../components/common/Pagination'
import type { ArticleCategory, ArticleList, PagedResult } from '../types'

type TabKey = ArticleCategory | 'ALL'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'NOTICE', label: '공지사항' },
  { key: 'STORY', label: '우리 이야기' },
  { key: 'FREE', label: '자유게시판' },
  { key: 'FELLOWSHIP', label: '미중서부 장학기금' },
]

// "전체" 탭에서 각 글이 어느 게시판 글인지 보여주기 위한 카테고리 라벨.
const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  NOTICE: '공지사항', STORY: '우리 이야기', FREE: '자유게시판', FELLOWSHIP: '미중서부 장학기금', HISTORY: '연혁',
}

const PAGE_SIZE = 15

export default function CommunityPage() {
  const { category = 'all' } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, member } = useAuthStore()
  const [showWrite, setShowWrite] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })
  const [page, setPage] = useState(1)
  const [insertingImage, setInsertingImage] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const activeCategory = category.toUpperCase() as TabKey

  const canWriteNotice = member?.role === 'OFFICER' || member?.role === 'ADMIN'
  const canWrite = activeCategory === 'ALL'
    ? false
    : (activeCategory === 'STORY' || activeCategory === 'FREE') ? isAuthenticated : canWriteNotice

  useEffect(() => setPage(1), [activeCategory])

  const { data, refetch } = useQuery({
    queryKey: ['articles', activeCategory, page],
    queryFn: async () => (await articlesApi.getList({
      category: activeCategory === 'ALL' ? undefined : activeCategory, page, pageSize: PAGE_SIZE,
    })).data as PagedResult<ArticleList>,
  })

  // 커서 위치에 사진을 삽입합니다. 본문 텍스트 안에 [[img:...]] 마커로 끼워 넣고,
  // 상세 페이지에서는 이 마커를 실제 사진으로 바꿔서 보여줍니다.
  const insertImage = async (file: File) => {
    setInsertingImage(true)
    try {
      const dataUrl = await fileToResizedDataUrl(file, 800, 800, 0.75)
      const marker = `\n[[img:${dataUrl}]]\n`
      const el = contentRef.current
      const pos = el?.selectionStart ?? form.content.length
      const newContent = form.content.slice(0, pos) + marker + form.content.slice(pos)
      setForm((f) => ({ ...f, content: newContent }))
      requestAnimationFrame(() => {
        const newPos = pos + marker.length
        el?.focus()
        el?.setSelectionRange(newPos, newPos)
      })
    } catch (err: any) {
      toast.error(err?.message || '사진 삽입에 실패했습니다.')
    } finally {
      setInsertingImage(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeCategory === 'ALL') return
    try {
      // 작성자 이름 옆에 (입학연도 학과)를 함께 표기해, 목록/상세 어디서나 누가 쓴 글인지 바로 알 수 있게 합니다.
      const authorName = member ? `${member.name} (${member.entryYear} ${member.major})` : '익명'
      await articlesApi.create({
        category: activeCategory, title: form.title, content: form.content, authorName,
      })
      toast.success('등록되었습니다.')
      setShowWrite(false)
      setForm({ title: '', content: '' })
      refetch()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '등록에 실패했습니다.')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">게시판</h1>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => navigate(`/community/${t.key.toLowerCase()}`)}
              className={`px-4 py-1.5 text-sm rounded-full font-medium ${
                activeCategory === t.key ? 'bg-crimson text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        {canWrite && (
          <button onClick={() => setShowWrite(!showWrite)}
            className="text-sm text-crimson font-medium border border-crimson rounded-lg px-3 py-1.5 hover:bg-crimson-50">
            {showWrite ? '취소' : '+ 새 글 작성'}
          </button>
        )}
      </div>

      {showWrite && (
        <form onSubmit={submit} className="bg-white border border-gray-100 rounded-xl p-5 mb-6 space-y-3">
          <input required placeholder="제목" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <label className={`text-xs font-medium border border-crimson text-crimson rounded-lg px-3 py-1.5 hover:bg-crimson-50 cursor-pointer ${insertingImage ? 'opacity-50 pointer-events-none' : ''}`}>
              {insertingImage ? '처리 중...' : '+ 사진 삽입'}
              <input type="file" accept="image/*" className="hidden" disabled={insertingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) insertImage(file)
                  e.target.value = ''
                }} />
            </label>
            <span className="text-xs text-gray-400">커서 위치에 사진이 삽입됩니다.</span>
          </div>
          <textarea ref={contentRef} required rows={8} placeholder="내용" value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="bg-crimson text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-crimson-800">
            등록
          </button>
        </form>
      )}

      <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-100">
        {data?.items.map((a) => (
          <li key={a.id}>
            <Link to={`/community/${category}/${a.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-crimson-50">
              <span className="truncate flex items-center gap-2">
                {activeCategory === 'ALL' && (
                  <span className="text-[10px] font-semibold text-crimson bg-crimson-50 rounded px-1.5 py-0.5 shrink-0">
                    {CATEGORY_LABELS[a.category]}
                  </span>
                )}
                <span className="truncate">{a.title}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                <span className="whitespace-nowrap">{a.authorName} · {format(new Date(a.createdAt), 'yyyy.MM.dd')}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                  조회 {a.viewCount}
                </span>
                {(a.category === 'FREE' || a.category === 'STORY') && (
                  <>
                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                      댓글 {a.commentCount}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      a.likeCount > 0 ? 'bg-crimson-50 text-crimson' : 'bg-gray-100 text-gray-500'
                    }`}>
                      ♥ {a.likeCount}
                    </span>
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
        {!data?.items.length && <li className="px-4 py-6 text-sm text-gray-400 text-center">등록된 글이 없습니다.</li>}
      </ul>

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  )
}
