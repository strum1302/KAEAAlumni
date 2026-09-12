import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import YouTube from 'react-youtube'
import { eventsApi, galleryApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { getGoogleMapsLink } from '../utils/maps'
import { fileToResizedDataUrl } from '../utils/image'
import { getYouTubeVideoId, getVideoEmbedUrl } from '../utils/youtube'
import type { EventDetail, GalleryItem, PagedResult } from '../types'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { member } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'PHOTO' | 'VIDEO'>('PHOTO')
  const [showAddMedia, setShowAddMedia] = useState(false)
  const [showRsvp, setShowRsvp] = useState(false)
  const [showNotify, setShowNotify] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null)

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

  // 목록은 사진마다 축소 썸네일로 채워져 있을 수 있어(초기 로딩 속도를 위해), 실제로 눌러서
  // 크게 볼 때는 원본 화질을 따로 받아온다.
  const openPhoto = async (item: GalleryItem) => {
    setSelectedPhoto(item)
    if (item.mediaType !== 'PHOTO' || !item.thumbnailUrl) return
    try {
      const res = await galleryApi.getById(item.id)
      const full = res.data as GalleryItem
      setSelectedPhoto((prev) => (prev && prev.id === item.id ? { ...prev, mediaUrl: full.mediaUrl } : prev))
    } catch {
      // 무시 — 실패해도 이미 축소본이 떠 있으니 화면 자체는 문제없다.
    }
  }

  if (!event) return <p className="text-sm text-gray-400">불러오는 중...</p>

  return (
    <div className="space-y-8">
      <Link to="/events" className="text-sm text-crimson hover:underline">&larr; 목록으로</Link>

      {/* 행사 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{event.title}</h1>
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
        {event.description && <p className="text-sm text-gray-600 mt-3">{event.description}</p>}
      </div>

      {/* 온라인 참가신청 버튼 - 버튼을 눌러야 신청서 모달이 열립니다 */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowRsvp(true)}
          className="bg-crimson text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-crimson-800 transition-colors">
          온라인 참가신청
        </button>
        {canManage && (
          <button onClick={() => setShowNotify(true)}
            className="border border-crimson text-crimson font-semibold px-5 py-2.5 rounded-lg hover:bg-crimson-50 transition-colors">
            참가자에게 메일 보내기
          </button>
        )}
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
                <button type="button" onClick={() => openPhoto(item)} className="block w-full">
                  <img src={item.mediaUrl} alt={item.title} loading="lazy" className="w-full aspect-video object-cover hover:opacity-90 transition-opacity" />
                </button>
              ) : getYouTubeVideoId(item.mediaUrl) ? (
                <YouTube videoId={getYouTubeVideoId(item.mediaUrl)!} opts={{ width: '100%' }} className="w-full aspect-video" />
              ) : (
                // YouTube가 아니면(Google Drive 공유 링크 등) 일반 iframe으로 재생한다.
                <iframe className="w-full aspect-video" src={getVideoEmbedUrl(item.mediaUrl)} allowFullScreen />
              )}
              <p className="text-xs text-gray-600 px-2 py-1.5 truncate">{item.title}</p>
            </div>
          ))}
          {!gallery?.items.length && <p className="text-sm text-gray-400 col-span-3">등록된 미디어가 없습니다.</p>}
        </div>
      </div>

      {/* 사진 확대 라이트박스 */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setSelectedPhoto(null)}>
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.mediaUrl} alt={selectedPhoto.title}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl mx-auto" />
            <p className="text-white text-center mt-3">{selectedPhoto.title}</p>
            {selectedPhoto.description && (
              <p className="text-gray-300 text-sm text-center mt-1">{selectedPhoto.description}</p>
            )}
          </div>
        </div>
      )}

      {showAddMedia && (
        <AddMediaModal eventId={id!} onClose={() => setShowAddMedia(false)} onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['gallery', 'event', id] })
          queryClient.invalidateQueries({ queryKey: ['event', id] })
        }} />
      )}

      {showRsvp && (
        <RsvpModal eventId={id!} member={member} onClose={() => setShowRsvp(false)}
          onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['event', id] })} />
      )}

      {showNotify && (
        <NotifyModal eventId={id!} onClose={() => setShowNotify(false)} />
      )}
    </div>
  )
}

// 참가 신청(RSVP) 모달. 로그인한 회원은 이름/이메일/휴대전화/학번·전공을 프로필에서 자동으로
// 채워주고, 비로그인 게스트는 직접 입력한다.
function RsvpModal({ eventId, member, onClose, onSubmitted }: {
  eventId: string
  member: { name: string; email: string; cellPhone: string; entryYear: number; major: string } | null
  onClose: () => void
  onSubmitted: () => void
}) {
  const [rsvp, setRsvp] = useState({
    guestName: member?.name || '', email: member?.email || '', cellPhone: member?.cellPhone || '',
    graduationInfo: member ? `${member.entryYear} ${member.major}` : '', additionalGuests: '0', note: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await eventsApi.createRsvp(eventId, { ...rsvp, additionalGuests: Number(rsvp.additionalGuests) })
      toast.success('참가 신청이 완료되었습니다.')
      onSubmitted()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '참가 신청에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">온라인 참가 신청 (RSVP)</h3>
          <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
            닫기
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">성명</label>
            <input required placeholder="성명" value={rsvp.guestName}
              onChange={(e) => setRsvp({ ...rsvp, guestName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">이메일</label>
            <input required type="email" placeholder="이메일" value={rsvp.email}
              onChange={(e) => setRsvp({ ...rsvp, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">휴대전화</label>
            <input required placeholder="휴대전화" value={rsvp.cellPhone}
              onChange={(e) => setRsvp({ ...rsvp, cellPhone: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">학번/과</label>
            <input required placeholder="예: 83 전산학과" value={rsvp.graduationInfo}
              onChange={(e) => setRsvp({ ...rsvp, graduationInfo: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">동반인원</label>
            <input type="number" min={0} placeholder="동반인원" value={rsvp.additionalGuests}
              onChange={(e) => setRsvp({ ...rsvp, additionalGuests: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">메모 (선택)</label>
            <textarea rows={4} placeholder="메모 (선택)" value={rsvp.note}
              onChange={(e) => setRsvp({ ...rsvp, note: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y" />
          </div>
          <button type="submit" disabled={submitting}
            className="md:col-span-2 bg-crimson text-white font-medium py-2.5 rounded-lg hover:bg-crimson-800 transition-colors disabled:opacity-60">
            {submitting ? '제출 중...' : '참가 신청서 제출'}
          </button>
        </form>
      </div>
    </div>
  )
}

// 참가자 공지 메일 발송 모달. 실제 수신자 목록은 서버가 target 값을 보고 DB에서 조립하므로
// (임의 주소로 발송하지 못하도록) 여기서는 대상 구분/제목/본문만 입력받아 보낸다.
function NotifyModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [target, setTarget] = useState<'ALL' | 'RSVP' | 'NOT_RSVP'>('ALL')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const targetLabel = { ALL: '전체 회원', RSVP: '이 행사 신청자', NOT_RSVP: '이 행사 미신청 회원' }[target]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirm(`${targetLabel}에게 메일을 발송합니다. 계속할까요?`)) return
    setSending(true)
    try {
      const res = await eventsApi.notify(eventId, { target, subject, body })
      toast.success(`${res.data.recipientCount}명에게 발송을 시작했습니다. 잠시 후 처리됩니다.`)
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '발송 요청에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
        <h3 className="font-bold text-gray-800">참가자에게 메일 보내기</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            {(['ALL', 'RSVP', 'NOT_RSVP'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTarget(t)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                  target === t ? 'bg-crimson text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {{ ALL: '전체 회원', RSVP: '신청자만', NOT_RSVP: '미신청자만' }[t]}
              </button>
            ))}
          </div>
          <input required placeholder="제목" value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <textarea required rows={8} placeholder="본문" value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">취소</button>
            <button type="submit" disabled={sending}
              className="flex-1 bg-crimson text-white rounded-lg py-2 text-sm disabled:opacity-60">
              {sending ? '발송 요청 중...' : `${targetLabel}에게 발송`}
            </button>
          </div>
        </form>
      </div>
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
  const [form, setForm] = useState({ title: '', mediaType: 'PHOTO', mediaUrl: '', thumbnailUrl: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handlePhotoFile = async (file: File) => {
    setUploading(true)
    try {
      // 원본과 별도로 작은 썸네일도 함께 만들어 둔다 — 행사 상세 페이지의 사진 목록이나
      // 행사 목록 카드 썸네일이 이걸 대신 받아서 초기 로딩이 느려지지 않게 하기 위함.
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
          <select value={form.mediaType}
            onChange={(e) => setForm({ ...form, mediaType: e.target.value, mediaUrl: '', thumbnailUrl: '' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="PHOTO">사진</option>
            <option value="VIDEO">영상 (YouTube / Google Drive)</option>
          </select>
          <input required placeholder="제목" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          {form.mediaType === 'PHOTO' ? (
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
          ) : (
            <input required placeholder="YouTube 또는 Google Drive 링크" value={form.mediaUrl}
              onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          )}
          <textarea placeholder="설명 (선택)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">취소</button>
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
