import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import YouTube from 'react-youtube'
import { eventsApi, galleryApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { getGoogleMapsLink } from '../utils/maps'
import type { EventDetail, GalleryItem, PagedResult } from '../types'

function extractYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/)
  return match ? match[1] : url
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { member } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'PHOTO' | 'VIDEO'>('PHOTO')
  const [showAddMedia, setShowAddMedia] = useState(false)
  const [rsvp, setRsvp] = useState({
    guestName: member?.name || '', email: member?.email || '', cellPhone: member?.cellPhone || '',
    graduationInfo: '', additionalGuests: '0', note: '',
  })

  const canManage = member?.role === 'OFFICER' || member?.role === 'ADMIN'

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => (await eventsApi.getById(id!)).data as EventDetail,
    enabled: !!id,
  })

  const { data: gallery } = useQuery({
    queryKey: ['gallery', 'event', id, tab],
    queryFn: async () => (await galleryApi.getList({ eventId: id, mediaType: tab, pageSize: 50 })).data as PagedResult<GalleryItem>,
    enabled: !!id,
  })

  const submitRsvp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await eventsApi.createRsvp(id!, { ...rsvp, additionalGuests: Number(rsvp.additionalGuests) })
      toast.success('참가 신청이 완료되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['event', id] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '참가 신청에 실패했습니다.')
    }
  }

  if (!event) return <p className="text-sm text-gray-400">불러오는 중...</p>

  return (
    <div className="space-y-8">
      {/* 행사 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{event.title}</h1>
        {event.description && <p className="text-sm text-gray-600 mb-3">{event.description}</p>}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
          <span>일시: {format(new Date(event.eventDate), 'yyyy년 M월 d일 (EEE) HH:mm')}</span>
          <span>
            장소: {event.location}
            {event.googleMapsUrl && (
              <a
                href={getGoogleMapsLink(event.googleMapsUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-crimson hover:underline"
              >
                지도에서 보기 &gt;
              </a>
            )}
          </span>
          <span>참가비: {event.fee > 0 ? `$${event.fee.toFixed(2)}` : '무료'}</span>
          <span>현재 신청: 총 {event.currentAttendees}명</span>
        </div>
      </div>

      {/* RSVP 폼 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-bold text-crimson mb-4">온라인 참가 신청 (RSVP)</h2>
        <form onSubmit={submitRsvp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required placeholder="성명" value={rsvp.guestName}
            onChange={(e) => setRsvp({ ...rsvp, guestName: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input required type="email" placeholder="이메일" value={rsvp.email}
            onChange={(e) => setRsvp({ ...rsvp, email: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input required placeholder="휴대전화" value={rsvp.cellPhone}
            onChange={(e) => setRsvp({ ...rsvp, cellPhone: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input required placeholder="학번/과 (예: 83 전산학과)" value={rsvp.graduationInfo}
            onChange={(e) => setRsvp({ ...rsvp, graduationInfo: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input type="number" min={0} placeholder="동반인원" value={rsvp.additionalGuests}
            onChange={(e) => setRsvp({ ...rsvp, additionalGuests: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="메모 (선택)" value={rsvp.note}
            onChange={(e) => setRsvp({ ...rsvp, note: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button type="submit"
            className="md:col-span-2 bg-crimson text-white font-medium py-2.5 rounded-lg hover:bg-crimson-800 transition-colors">
            참가 신청서 제출
          </button>
        </form>
      </div>

      {/* 하부 미디어 갤러리 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <TabButton active={tab === 'PHOTO'} onClick={() => setTab('PHOTO')} label={`사진 갤러리 (${event.photoCount})`} />
            <TabButton active={tab === 'VIDEO'} onClick={() => setTab('VIDEO')} label={`영상 갤러리 (${event.videoCount})`} />
          </div>
          {canManage && (
            <button onClick={() => setShowAddMedia(true)}
              className="text-sm text-crimson font-medium border border-crimson rounded-lg px-3 py-1.5 hover:bg-crimson-50">
              + 현장 사진/영상 추가 등록
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {gallery?.items.map((item) => (
            <div key={item.id} className="rounded-xl overflow-hidden bg-gray-100">
              {item.mediaType === 'PHOTO' ? (
                <img src={item.mediaUrl} alt={item.title} className="w-full aspect-video object-cover" />
              ) : (
                <YouTube videoId={extractYouTubeId(item.mediaUrl)} opts={{ width: '100%' }} className="w-full aspect-video" />
              )}
              <p className="text-xs text-gray-600 px-2 py-1.5 truncate">{item.title}</p>
            </div>
          ))}
          {!gallery?.items.length && <p className="text-sm text-gray-400 col-span-3">등록된 미디어가 없습니다.</p>}
        </div>
      </div>

      {showAddMedia && (
        <AddMediaModal eventId={id!} onClose={() => setShowAddMedia(false)} onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['gallery', 'event', id] })
          queryClient.invalidateQueries({ queryKey: ['event', id] })
        }} />
      )}
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg ${active ? 'bg-crimson text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {label}
    </button>
  )
}

function AddMediaModal({ eventId, onClose, onCreated }: { eventId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: '', mediaType: 'PHOTO', mediaUrl: '', description: '' })
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await galleryApi.create({ ...form, eventId })
      toast.success('미디어가 등록되었습니다.')
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-gray-800">현장 사진/영상 추가 등록</h3>
        <form onSubmit={submit} className="space-y-3">
          <select value={form.mediaType} onChange={(e) => setForm({ ...form, mediaType: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="PHOTO">사진</option>
            <option value="VIDEO">영상 (YouTube)</option>
          </select>
          <input required placeholder="제목" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input required placeholder={form.mediaType === 'PHOTO' ? '이미지 URL' : 'YouTube URL'} value={form.mediaUrl}
            onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="설명 (선택)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">취소</button>
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
