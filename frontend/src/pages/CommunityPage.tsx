import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { articlesApi } from '../api'
import { useAuthStore } from '../store/authStore'
import Pagination from '../components/common/Pagination'
import type { ArticleCategory, ArticleList, PagedResult } from '../types'

const TABS: { key: ArticleCategory; label: string }[] = [
  { key: 'NOTICE', label: '공지사항' },
  { key: 'STORY', label: '우리 이야기' },
  { key: 'FELLOWSHIP', label: '미중서부 장학기금' },
]

const PAGE_SIZE = 15

export default function CommunityPage() {
  const { category = 'notice' } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, member } = useAuthStore()
  const [showWrite, setShowWrite] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })
  const [page, setPage] = useState(1)
  const activeCategory = category.toUpperCase() as ArticleCategory

  const canWriteNotice = member?.role === 'OFFICER' || member?.role === 'ADMIN'
  const canWrite = activeCategory === 'STORY' ? isAuthenticated : canWriteNotice

  useEffect(() => setPage(1), [activeCategory])

  const { data, refetch } = useQuery({
    queryKey: ['articles', activeCategory, page],
    queryFn: async () => (await articlesApi.getList({ category: activeCategory, page, pageSize: PAGE_SIZE })).data as PagedResult<ArticleList>,
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await articlesApi.create({
        category: activeCategory, title: form.title, content: form.content,
        authorName: member?.name || '익명',
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
      <h1 className="text-2xl font-bold text-gray-800 mb-4">커뮤니티</h1>

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
          <textarea required rows={5} placeholder="내용" value={form.content}
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
              className="flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-crimson-50">
              <span>{a.title}</span>
              <span className="text-xs text-gray-400">{format(new Date(a.createdAt), 'yyyy.MM.dd')} · 조회 {a.viewCount}</span>
            </Link>
          </li>
        ))}
        {!data?.items.length && <li className="px-4 py-6 text-sm text-gray-400 text-center">등록된 글이 없습니다.</li>}
      </ul>

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  )
}
