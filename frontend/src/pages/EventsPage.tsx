import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { eventsApi, galleryApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { getGoogleMapsLink } from '../utils/maps'
import Pagination from '../components/common/Pagination'
import type { EventDetail, EventList, GalleryItem, PagedResult } from '../types'

const PAGE_SIZE = 12

export default function EventsPage() {
  const { member } = useAuthStore()
  const canManage = member?.role === 'OFFICER' || member?.role === 'ADMIN'
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [year, setYear] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<EventDetail | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryItem | null>(null)

  // 라이트박스가 열려 있을 때 ESC 키로도 닫을 수 있게 처리
  useEffect(() => {
    if (!lightboxPhoto) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxPhoto(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxPhoto])

  const { data: years } = useQuery({
    queryKey: ['events', 'years'],
    queryFn: async () => (await eventsApi.getYears()).data as number[],
  })

  const { data } = useQuery({
    queryKey: ['events', 'all', year, page],
    queryFn: async () => (await eventsApi.getList({ year: year ?? undefined, page, pageSize: PAGE_SIZE })).data as PagedResult<EventList>,
  })

  const handleDelete = async (ev: EventList) => {
    const confirmed = window.confirm(`"${ev.title}" 행사를 삭제하시겠습니까?`)
    if (!confirmed) return

    setDeletingId(ev.id)
    try {
      await eventsApi.delete(ev.id)
      toast.success('삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['events'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = async (ev: EventList) => {
    try {
      const res = await eventsApi.getById(ev.id)
      setEditing(res.data as EventDetail)
    } catch {
      toast.error('행사 정보를 불러오지 못했습니다.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">행사 및 모임</h1>
        {canManage && (
          <button onClick={() => setShowAdd(true)}
            className="text-sm text-white bg-crimson font-medium rounded-lg px-4 py-2 hover:bg-crimson-800">
            + 행사 등록
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">연간 행사 일정 — 총장배 골프대회, 고연전, 야유회, 송년회 등</p>

      <div className="mb-6">
        <select
          value={year ?? ''}
          onChange={(e) => { setYear(e.target.value ? Number(e.target.value) : null); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">전체 연도</option>
          {years?.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.items.map((ev) => (
          <EventCard
            key={ev.id}
            ev={ev}
            canManage={canManage}
            deletingId={deletingId}
            onEdit={openEdit}
            onDelete={handleDelete}
            onOpenLightbox={setLightboxPhoto}
          />
        ))}
        {!data?.items.length && <p className="text-sm text-gray-400">등록된 행사가 없습니다.</p>}
      </div>

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      {/* 썸네일 클릭 시 확대해서 보여주는 라이트박스 */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setLightboxPhoto(null)}>
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative inline-block max-w-full mx-auto">
              <img src={lightboxPhoto.mediaUrl} alt={lightboxPhoto.title}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl block" />
              <button
                onClick={() => setLightboxPhoto(null)}
                aria-label="닫기"
                className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white text-xl leading-none hover:bg-black/70"
              >
                &times;
              </button>
            </div>
            <p className="text-white text-center mt-3">{lightboxPhoto.title}</p>
          </div>
        </div>
      )}

      {showAdd && (
        <AddEventModal
          onClose={() => setShowAdd(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['events'] })}
        />
      )}

      {editing && (
        <EditEventModal
          event={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['events'] })
            queryClient.invalidateQueries({ queryKey: ['event', editing.id] })
          }}
        />
      )}
    </div>
  )
}

// 행사 목록 카드 - 등록된 사진이 있으면 맨 위에 썸네일을 보여주고, 클릭하면 상세 페이지로
// 이동하지 않고 바로 라이트박스로 확대해서 볼 수 있다.
function EventCard({
  ev, canManage, deletingId, onEdit, onDelete, onOpenLightbox,
}: {
  ev: EventList
  canManage: boolean
  deletingId: string | null
  onEdit: (ev: EventList) => void
  onDelete: (ev: EventList) => void
  onOpenLightbox: (item: GalleryItem) => void
}) {
  const navigate = useNavigate()
  const isPast = new Date(ev.eventDate) < new Date()

  const { data: thumbs } = useQuery({
    queryKey: ['gallery', 'event-thumb', ev.id],
    queryFn: async () => (await galleryApi.getList({ eventId: ev.id, mediaType: 'PHOTO', pageSize: 1 })).data as PagedResult<GalleryItem>,
  })
  const thumb = thumbs?.items[0]

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {thumb && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenLightbox(thumb) }}
          className="block w-full aspect-video bg-gray-100 overflow-hidden group"
        >
          <img src={thumb.mediaUrl} alt={ev.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        </button>
      )}
      <div className="p-5">
        <div onClick={() => navigate(`/events/${ev.id}`)} className="cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800">{ev.title}</h2>
            {!ev.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">비활성</span>}
          </div>
          <p className="text-sm text-gray-500">일시: {format(new Date(ev.eventDate), 'yyyy.MM.dd (EEE) HH:mm')}</p>
          <p className="text-sm text-gray-500">
            장소: {ev.location}
            {ev.googleMapsUrl && (
              <a
                href={getGoogleMapsLink(ev.googleMapsUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-2 text-crimson hover:underline"
              >
                지도에서 보기 &gt;
              </a>
            )}
          </p>
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-gray-500">
              참가비: {ev.fee > 0 ? `$${ev.fee.toFixed(2)}` : '무료'}
            </span>
            <span className="text-gray-500">
              신청 {ev.currentAttendees}{ev.maxAttendees > 0 ? ` / ${ev.maxAttendees}` : ''}명
            </span>
          </div>
        </div>
        {canManage && (
          isPast ? (
            <p className="text-right text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
              이미 지난 행사는 수정/삭제할 수 없습니다.
            </p>
          ) : (
            <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-gray-50">
              <button
                onClick={() => onEdit(ev)}
                className="text-xs text-crimson hover:text-crimson-800"
              >
                수정
              </button>
              <button
                onClick={() => onDelete(ev)}
                disabled={deletingId === ev.id}
                className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {deletingId === ev.id ? '삭제 중...' : '삭제'}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function AddEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '', description: '', eventDate: '', location: '', googleMapsUrl: '', fee: '0', maxAttendees: '0',
  })
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await eventsApi.create({
        title: form.title,
        description: form.description || undefined,
        eventDate: new Date(form.eventDate).toISOString(),
        location: form.location,
        googleMapsUrl: form.googleMapsUrl || undefined,
        fee: Number(form.fee) || 0,
        maxAttendees: Number(form.maxAttendees) || 0,
      })
      toast.success('행사가 등록되었습니다.')
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
        <h3 className="font-bold text-gray-800">행사 등록</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="행사명 (예: 2026년 신년 하례식)" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="block text-xs text-gray-500 mb-1">일시</label>
            <input required type="datetime-local" value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <input required placeholder="장소" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="구글맵 주소 또는 링크 (선택, 예: 6520 W Diversey Ave, Chicago, IL)"
            value={form.googleMapsUrl}
            onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">참가비 ($, 0=무료)</label>
              <input type="number" min={0} step="0.01" value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">정원 (0=무제한)</label>
              <input type="number" min={0} value={form.maxAttendees}
                onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <textarea placeholder="설명 (선택)" value={form.description} rows={3}
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

function EditEventModal({
  event, onClose, onUpdated,
}: { event: EventDetail; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({
    title: event.title,
    description: event.description || '',
    eventDate: format(new Date(event.eventDate), "yyyy-MM-dd'T'HH:mm"),
    location: event.location,
    googleMapsUrl: event.googleMapsUrl || '',
    fee: String(event.fee),
    maxAttendees: String(event.maxAttendees),
    isActive: event.isActive,
  })
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await eventsApi.update(event.id, {
        title: form.title,
        description: form.description || undefined,
        eventDate: new Date(form.eventDate).toISOString(),
        location: form.location,
        googleMapsUrl: form.googleMapsUrl || undefined,
        fee: Number(form.fee) || 0,
        maxAttendees: Number(form.maxAttendees) || 0,
        isActive: form.isActive,
      })
      toast.success('행사 정보가 수정되었습니다.')
      onUpdated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-800">행사 수정</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="행사명" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="block text-xs text-gray-500 mb-1">일시</label>
            <input required type="datetime-local" value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <input required placeholder="장소" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="구글맵 주소 또는 링크 (선택)"
            value={form.googleMapsUrl}
            onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">참가비 ($, 0=무료)</label>
              <input type="number" min={0} step="0.01" value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">정원 (0=무제한)</label>
              <input type="number" min={0} value={form.maxAttendees}
                onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <textarea placeholder="설명 (선택)" value={form.description} rows={3}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            활성 상태로 표시
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">취소</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-crimson text-white rounded-lg py-2 text-sm disabled:opacity-60">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
