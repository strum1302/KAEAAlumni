import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { galleryApi, eventsApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { getYouTubeThumbnail } from '../utils/youtube'
import Pagination from '../components/common/Pagination'
import type { EventList, GalleryItem, PagedResult } from '../types'

const PAGE_SIZE = 16

export default function GalleryPage() {
  const { member } = useAuthStore()
  const canManage = member?.role === 'OFFICER' || member?.role === 'ADMIN'
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'ALL' | 'PHOTO' | 'VIDEO'>('ALL')
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => setPage(1), [filter])

  const { data } = useQuery({
    queryKey: ['gallery', 'all', filter, page],
    queryFn: async () => (await galleryApi.getList({
      mediaType: filter === 'ALL' ? undefined : filter, page, pageSize: PAGE_SIZE,
    })).data as PagedResult<GalleryItem>,
  })

  const handleDelete = async (item: GalleryItem) => {
    const confirmed = window.confirm(`"${item.title}" 항목을 삭제하시겠습니까?`)
    if (!confirmed) return

    setDeleting(true)
    try {
      await galleryApi.delete(item.id)
      toast.success('삭제되었습니다.')
      setSelected(null)
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">미디어 갤러리</h1>
        {canManage && (
          <button onClick={() => setShowAdd(true)}
            className="text-sm text-white bg-crimson font-medium rounded-lg px-4 py-2 hover:bg-crimson-800">
            + 미디어 등록
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">행사 사진 &amp; 영상 아카이브</p>

      <div className="flex gap-2 mb-6">
        {(['ALL', 'PHOTO', 'VIDEO'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-full font-medium ${
              filter === f ? 'bg-crimson text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f === 'ALL' ? '전체보기' : f === 'PHOTO' ? '사진만 보기' : '영상만 보기'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data?.items.map((item) => {
          const videoThumb = item.mediaType === 'VIDEO' ? (item.thumbnailUrl || getYouTubeThumbnail(item.mediaUrl)) : null
          return (
            <button key={item.id} onClick={() => setSelected(item)} className="text-left group">
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-square relative">
                {item.mediaType === 'PHOTO' ? (
                  <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : videoThumb ? (
                  <>
                    <img src={videoThumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-white text-2xl">▶</div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">▶</div>
                )}
                <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">
                  {item.mediaType === 'PHOTO' ? '사진' : '영상'}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-1.5 truncate">{item.title}</p>
              <p className="text-xs text-gray-400">{format(new Date(item.createdAt), 'yyyy.MM.dd')}</p>
            </button>
          )
        })}
        {!data?.items.length && <p className="text-sm text-gray-400 col-span-4">등록된 미디어가 없습니다.</p>}
      </div>

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setSelected(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            {selected.mediaType === 'PHOTO' ? (
              <img src={selected.mediaUrl} alt={selected.title} className="w-full rounded-xl" />
            ) : (
              <iframe
                className="w-full aspect-video rounded-xl"
                src={selected.mediaUrl.replace('watch?v=', 'embed/')}
                allowFullScreen
              />
            )}
            <p className="text-white text-center mt-3">{selected.title}</p>
            {selected.description && (
              <p className="text-gray-300 text-sm text-center mt-1">{selected.description}</p>
            )}
            {canManage && (
              <div className="text-center mt-3">
                <button
                  onClick={() => handleDelete(selected)}
                  disabled={deleting}
                  className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <AddGalleryModal
          onClose={() => setShowAdd(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['gallery'] })}
        />
      )}
    </div>
  )
}

function AddGalleryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [events, setEvents] = useState<EventList[]>([])
  const [form, setForm] = useState({
    title: '', description: '', mediaType: 'VIDEO' as 'PHOTO' | 'VIDEO',
    mediaUrl: '', thumbnailUrl: '', eventId: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    eventsApi.getList({ pageSize: 100 })
      .then((res) => setEvents((res.data as PagedResult<EventList>).items))
      .catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await galleryApi.create({
        title: form.title,
        description: form.description || undefined,
        mediaType: form.mediaType,
        mediaUrl: form.mediaUrl,
        thumbnailUrl: form.thumbnailUrl || undefined,
        eventId: form.eventId || undefined,
      })
      toast.success('등록되었습니다.')
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-800">미디어 등록</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="제목 (예: 교가 및 응원가 합창 영상)" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.mediaType} onChange={(e) => setForm({ ...form, mediaType: e.target.value as 'PHOTO' | 'VIDEO' })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="VIDEO">영상</option>
              <option value="PHOTO">사진</option>
            </select>
            <select value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">연결된 행사 없음</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
          <input required
            placeholder={form.mediaType === 'VIDEO' ? 'YouTube 링크 (예: https://www.youtube.com/watch?v=...)' : '이미지 URL'}
            value={form.mediaUrl}
            onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          {form.mediaType === 'VIDEO' && (
            <div className="space-y-2">
              <input
                placeholder="썸네일 이미지 URL (선택 — YouTube 링크는 자동으로 생성됩니다)"
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              {(() => {
                const preview = form.thumbnailUrl || getYouTubeThumbnail(form.mediaUrl)
                return preview ? (
                  <div className="flex items-center gap-2">
                    <img src={preview} alt="썸네일 미리보기" className="w-20 h-14 object-cover rounded border border-gray-200" />
                    <span className="text-xs text-gray-400">
                      {form.thumbnailUrl ? '직접 입력한 썸네일' : 'YouTube에서 자동 생성된 썸네일'}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    YouTube 링크를 입력하면 썸네일이 자동으로 표시됩니다. 다른 영상 사이트는 썸네일 URL을 직접 입력해주세요.
                  </p>
                )
              })()}
            </div>
          )}
          <textarea placeholder="설명 (선택)" value={form.description} rows={2}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">취소</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-crimson text-white rounded-lg py-2 text-sm disabled:opacity-60">
              {saving ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
