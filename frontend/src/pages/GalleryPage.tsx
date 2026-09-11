import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { galleryApi, eventsApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { getVideoEmbedUrl, getVideoThumbnail } from '../utils/youtube'
import { fileToResizedDataUrl } from '../utils/image'
import Pagination from '../components/common/Pagination'
import type { EventList, GalleryItem, PagedResult } from '../types'

const PAGE_SIZE = 16

// 행사에 연결된 미디어는 "행사명 - 사진/영상 제목" 형식으로, 행사와 무관한 자료(교가 등)는
// 제목만 표시합니다.
function mediaLabel(item: GalleryItem): string {
  return item.eventTitle ? `${item.eventTitle} - ${item.title}` : item.title
}

// 행사 사진 / 학교 캠퍼스 사진 / 교가·응원가 자료를 서로 섞이지 않게 나눠 볼 수 있는 대분류.
// URL의 ?category=CAMPUS 또는 ?category=SCHOOL_SONG 으로 홈페이지에서 바로 연결됩니다.
type GalleryScope = 'ALL' | 'EVENT' | 'CAMPUS' | 'SCHOOL_SONG'
const SCOPE_LABELS: Record<GalleryScope, string> = {
  ALL: '전체보기', EVENT: '행사 사진', CAMPUS: '학교 갤러리', SCHOOL_SONG: '교가 · 응원가',
}

export default function GalleryPage() {
  const { member } = useAuthStore()
  const canManage = member?.role === 'OFFICER' || member?.role === 'ADMIN'
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialScope: GalleryScope =
    searchParams.get('category') === 'CAMPUS' ? 'CAMPUS'
    : searchParams.get('category') === 'SCHOOL_SONG' ? 'SCHOOL_SONG'
    : searchParams.get('hasEvent') === 'true' ? 'EVENT'
    : 'ALL'
  const [scope, setScope] = useState<GalleryScope>(initialScope)
  const [filter, setFilter] = useState<'ALL' | 'PHOTO' | 'VIDEO'>('ALL')
  const [year, setYear] = useState<number | null>(null)
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => setPage(1), [scope, filter, year])

  // 목록은 사진마다 축소 썸네일로 채워져 있을 수 있어(초기 로딩 속도를 위해), 실제로 눌러서
  // 크게 볼 때는 원본 화질을 따로 받아온다. 우선 갖고 있는 걸로 바로 열고, 원본이 도착하면
  // 교체하는 방식이라 클릭했을 때 기다리는 느낌 없이 바로 라이트박스가 뜬다.
  const openLightbox = async (item: GalleryItem) => {
    setSelected(item)
    if (item.mediaType !== 'PHOTO' || !item.thumbnailUrl) return
    try {
      const res = await galleryApi.getById(item.id)
      const full = res.data as GalleryItem
      setSelected((prev) => (prev && prev.id === item.id ? { ...prev, mediaUrl: full.mediaUrl } : prev))
    } catch {
      // 무시 — 실패해도 이미 축소본이 떠 있으니 화면 자체는 문제없다.
    }
  }

  // 라이트박스가 열려 있을 때 ESC 키로도 닫을 수 있게 처리
  useEffect(() => {
    if (!selected) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected])

  const { data: years } = useQuery({
    queryKey: ['gallery', 'years'],
    queryFn: async () => (await galleryApi.getYears()).data as number[],
  })

  const { data } = useQuery({
    queryKey: ['gallery', 'all', scope, filter, year, page],
    queryFn: async () => (await galleryApi.getList({
      mediaType: filter === 'ALL' ? undefined : filter,
      year: year ?? undefined,
      hasEvent: scope === 'EVENT' ? true : scope === 'CAMPUS' || scope === 'SCHOOL_SONG' ? false : undefined,
      category: scope === 'CAMPUS' ? 'CAMPUS' : scope === 'SCHOOL_SONG' ? 'SCHOOL_SONG' : undefined,
      page, pageSize: PAGE_SIZE,
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
      <p className="text-sm text-gray-500 mb-4">행사 사진, 학교 캠퍼스 사진, 교가 &middot; 응원가 아카이브</p>

      <div className="flex gap-2 flex-wrap mb-3">
        {(['ALL', 'EVENT', 'CAMPUS', 'SCHOOL_SONG'] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)}
            className={`px-4 py-1.5 text-sm rounded-full font-medium ${
              scope === s ? 'bg-crimson text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {SCOPE_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <select
          value={year ?? ''}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">전체 연도</option>
          {years?.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'ALL' | 'PHOTO' | 'VIDEO')}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="ALL">전체보기</option>
          <option value="PHOTO">사진만 보기</option>
          <option value="VIDEO">영상만 보기</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data?.items.map((item) => {
          const videoThumb = item.mediaType === 'VIDEO' ? (item.thumbnailUrl || getVideoThumbnail(item.mediaUrl)) : null
          return (
            <div key={item.id} className="group">
              <button onClick={() => openLightbox(item)} className="text-left w-full block">
                <div className="rounded-xl overflow-hidden bg-gray-100 aspect-square relative">
                  {item.mediaType === 'PHOTO' ? (
                    <img src={item.mediaUrl} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : videoThumb ? (
                    <>
                      <img src={videoThumb} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-white text-2xl">▶</div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">▶</div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">
                    {item.mediaType === 'PHOTO' ? '사진' : '영상'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1.5 truncate">{mediaLabel(item)}</p>
                <p className="text-xs text-gray-400">{format(new Date(item.createdAt), 'yyyy.MM.dd')}</p>
              </button>
              {canManage && <GalleryItemAdminControls item={item} onDelete={() => handleDelete(item)} deleting={deleting} />}
            </div>
          )
        })}
        {!data?.items.length && <p className="text-sm text-gray-400 col-span-4">등록된 미디어가 없습니다.</p>}
      </div>

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setSelected(null)}>
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            {selected.mediaType === 'PHOTO' ? (
              <div className="relative inline-block max-w-full mx-auto">
                <img src={selected.mediaUrl} alt={selected.title} className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl block" />
                <button
                  onClick={() => setSelected(null)}
                  aria-label="닫기"
                  className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white text-xl leading-none hover:bg-black/70"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div className="relative">
                <iframe
                  className="w-full aspect-video rounded-xl"
                  src={getVideoEmbedUrl(selected.mediaUrl)}
                  allowFullScreen
                />
                <button
                  onClick={() => setSelected(null)}
                  aria-label="닫기"
                  className="absolute -top-11 right-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white text-xl leading-none hover:bg-white/20"
                >
                  &times;
                </button>
              </div>
            )}
            <p className="text-white text-center mt-3">{mediaLabel(selected)}</p>
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

// 그리드 카드에서 바로 정렬 순서를 바꾸고 삭제할 수 있는 관리자용 컨트롤
// (기존에는 항목을 눌러 라이트박스를 연 뒤에만 삭제가 가능했음)
function GalleryItemAdminControls({
  item, onDelete, deleting,
}: { item: GalleryItem; onDelete: () => void; deleting: boolean }) {
  const queryClient = useQueryClient()
  const [order, setOrder] = useState(item.displayOrder)
  const [saving, setSaving] = useState(false)
  const [togglingVisibility, setTogglingVisibility] = useState(false)

  const saveOrder = async () => {
    setSaving(true)
    try {
      await galleryApi.updateOrder(item.id, order)
      toast.success('정렬 순서가 변경되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '변경에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const toggleVisibility = async () => {
    setTogglingVisibility(true)
    try {
      await galleryApi.updateVisibility(item.id, !item.showOnHome)
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '변경에 실패했습니다.')
    } finally {
      setTogglingVisibility(false)
    }
  }

  return (
    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
      <input
        type="number"
        value={order}
        onChange={(e) => setOrder(Number(e.target.value))}
        title="정렬 순서 (작을수록 먼저 표시됩니다)"
        className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs"
      />
      <button
        onClick={saveOrder}
        disabled={saving || order === item.displayOrder}
        className="text-xs text-crimson font-medium px-2 py-1 rounded hover:bg-crimson-50 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {saving ? '저장 중...' : '순서저장'}
      </button>
      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer" title="체크 해제 시 홈페이지 목록에서 숨겨집니다 (갤러리에는 계속 노출)">
        <input
          type="checkbox"
          checked={item.showOnHome}
          disabled={togglingVisibility}
          onChange={toggleVisibility}
          className="rounded"
        />
        홈 노출
      </label>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50 ml-auto"
      >
        삭제
      </button>
    </div>
  )
}

function AddGalleryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [events, setEvents] = useState<EventList[]>([])
  const [form, setForm] = useState({
    title: '', description: '', mediaType: 'VIDEO' as 'PHOTO' | 'VIDEO',
    mediaUrl: '', thumbnailUrl: '', eventId: '', displayOrder: 0, showOnHome: true,
    category: '' as '' | 'CAMPUS' | 'SCHOOL_SONG',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    eventsApi.getList({ pageSize: 100 })
      .then((res) => setEvents((res.data as PagedResult<EventList>).items))
      .catch(() => {})
  }, [])

  const handlePhotoFile = async (file: File) => {
    setUploading(true)
    try {
      // 원본(라이트박스에서 크게 볼 때)과 별도로 작은 썸네일을 함께 만들어 둔다.
      // 목록(그리드) API는 이 썸네일이 있으면 그걸로 대신 응답을 채워서 보내기 때문에
      // (GalleryController 참고), 사진이 많이 쌓여도 갤러리 목록 로딩이 느려지지 않는다.
      const [dataUrl, thumbUrl] = await Promise.all([
        fileToResizedDataUrl(file, 1200, 1200, 0.8),
        fileToResizedDataUrl(file, 360, 360, 0.55),
      ])
      setForm((f) => ({ ...f, mediaUrl: dataUrl, thumbnailUrl: thumbUrl }))
    } catch (err: any) {
      toast.error(err?.message || '이미지를 처리하지 못했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.mediaUrl) {
      toast.error(form.mediaType === 'PHOTO' ? '사진을 선택해주세요.' : 'YouTube 또는 Google Drive 링크를 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      await galleryApi.create({
        title: form.title,
        description: form.description || undefined,
        mediaType: form.mediaType,
        mediaUrl: form.mediaUrl,
        thumbnailUrl: form.thumbnailUrl || undefined,
        eventId: form.eventId || undefined,
        displayOrder: form.displayOrder,
        showOnHome: form.showOnHome,
        category: form.eventId ? undefined : (form.category || undefined),
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
            <select value={form.mediaType}
              onChange={(e) => setForm({ ...form, mediaType: e.target.value as 'PHOTO' | 'VIDEO', mediaUrl: '', thumbnailUrl: '' })}
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
          {!form.eventId && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                분류 (연결된 행사가 없을 때만 — 홈페이지의 "학교 갤러리"/"고대 자료실" 위젯에 노출됩니다)
              </label>
              <select value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">분류 없음 (갤러리 전체보기에만 노출)</option>
                <option value="CAMPUS">캠퍼스 사진 (학교 갤러리)</option>
                <option value="SCHOOL_SONG">교가 / 응원가 등 자료 (고대 자료실)</option>
              </select>
            </div>
          )}
          {form.mediaType === 'VIDEO' ? (
            <input required
              placeholder="YouTube 또는 Google Drive 링크 (Drive는 '링크가 있는 모든 사용자'로 공유 필요)"
              value={form.mediaUrl}
              onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          ) : (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handlePhotoFile(file)
                }}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-crimson-50 file:text-crimson file:text-sm file:font-medium"
              />
              {uploading && <p className="text-xs text-gray-400">사진을 불러오는 중...</p>}
              {form.mediaUrl && !uploading && (
                <img src={form.mediaUrl} alt="미리보기" className="max-h-48 rounded-lg border border-gray-200" />
              )}
            </div>
          )}
          {form.mediaType === 'VIDEO' && (
            <div className="space-y-2">
              <input
                placeholder="썸네일 이미지 URL (선택 — YouTube/Drive 링크는 자동으로 생성됩니다)"
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              {(() => {
                const preview = form.thumbnailUrl || getVideoThumbnail(form.mediaUrl)
                return preview ? (
                  <div className="flex items-center gap-2">
                    <img src={preview} alt="썸네일 미리보기" className="w-20 h-14 object-cover rounded border border-gray-200" />
                    <span className="text-xs text-gray-400">
                      {form.thumbnailUrl ? '직접 입력한 썸네일' : 'YouTube/Drive에서 자동 생성된 썸네일'}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    YouTube 또는 Google Drive 링크를 입력하면 썸네일이 자동으로 표시됩니다. 다른 영상 사이트는 썸네일 URL을 직접 입력해주세요.
                  </p>
                )
              })()}
            </div>
          )}
          <textarea placeholder="설명 (선택)" value={form.description} rows={2}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              정렬 순서 (작을수록 먼저 표시됩니다. 예: 교가는 0)
            </label>
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.showOnHome}
              onChange={(e) => setForm({ ...form, showOnHome: e.target.checked })}
              className="rounded"
            />
            홈페이지에 표시 (체크 해제 시 갤러리 전체보기에만 노출됩니다)
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">취소</button>
            <button type="submit" disabled={saving || uploading}
              className="flex-1 bg-crimson text-white rounded-lg py-2 text-sm disabled:opacity-60">
              {saving ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
