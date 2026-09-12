import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { eventsApi, articlesApi, galleryApi } from '../api'
import { getVideoEmbedUrl, getVideoThumbnail } from '../utils/youtube'
import { getGoogleMapsLink } from '../utils/maps'
import CampusHero from '../components/CampusHero'
import type { EventList, ArticleList, GalleryItem, PagedResult } from '../types'

// 히어로에 쓸 캠퍼스 사진 9장 (사계절 + 응원전 분위기가 고루 섞이도록 27장 중 선별).
// 나머지 사진들은 public/images/hero/에 그대로 남아있으니, 나중에 갤러리 "고려대 캠퍼스"
// 항목으로 옮기고 싶으면 그쪽에서 재사용할 수 있습니다.
// 모바일에서는 화면을 3분할하지 않고 한 장씩 크게 보여주므로, 세로로 긴 이 사진들이
// 계속 쓰입니다.
const HERO_IMAGES = [1, 2, 3, 4, 7, 9, 12, 22, 26].map(
  (n) => `/images/hero/hero-${String(n).padStart(2, '0')}.jpg`
)

// 데스크톱 전용 히어로 사진 - 학교에서 받은 가로로 넓은 공식 사진 9장(분수대, 본관,
// 정문, 항공뷰 등). 세로 사진 3분할 대신 화면 전체를 채우는 가로 배너 한 장으로
// 보여줘야 잘리지 않고 예쁘게 나와서, 위 HERO_IMAGES와 별도로 관리합니다.
// 2번째 사진(잔디밭 넓게 나온 컷)은 기본(가운데) 크롭이면 본관이 위쪽에서 잘려서
// position: 'top'으로 위쪽을 기준으로 자르도록 지정했습니다.
const HERO_IMAGES_DESKTOP = Array.from({ length: 9 }, (_, i) => ({
  src: `/images/hero-wide/hero-wide-${String(i + 1).padStart(2, '0')}.jpg`,
  ...(i === 1 ? { position: 'top' as const } : {}),
}))

export default function HomePage() {
  const [selectedMedia, setSelectedMedia] = useState<GalleryItem | null>(null)

  // 홈 위젯 목록은 사진마다 축소 썸네일로 채워져 있을 수 있어(초기 로딩 속도를 위해),
  // 실제로 눌러서 크게 볼 때는 원본 화질을 따로 받아온다.
  const openMedia = async (item: GalleryItem) => {
    setSelectedMedia(item)
    if (item.mediaType !== 'PHOTO' || !item.thumbnailUrl) return
    try {
      const res = await galleryApi.getById(item.id)
      const full = res.data as GalleryItem
      setSelectedMedia((prev) => (prev && prev.id === item.id ? { ...prev, mediaUrl: full.mediaUrl } : prev))
    } catch {
      // 무시 — 실패해도 이미 축소본이 떠 있으니 화면 자체는 문제없다.
    }
  }

  const { data: events } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async () => (await eventsApi.getList({ upcomingOnly: true, pageSize: 3 })).data as PagedResult<EventList>,
  })

  const { data: notices } = useQuery({
    queryKey: ['articles', 'NOTICE'],
    queryFn: async () => (await articlesApi.getList({ category: 'NOTICE', pageSize: 3 })).data as PagedResult<ArticleList>,
  })

  const { data: stories } = useQuery({
    queryKey: ['articles', 'STORY'],
    queryFn: async () => (await articlesApi.getList({ category: 'STORY', pageSize: 3 })).data as PagedResult<ArticleList>,
  })

  // 행사에 연결된 사진/영상("최근 행사 미디어")과 교가·응원가 등 특정 행사와 무관한
  // 고대 자료("고대 자료실")를 서로 섞이지 않도록 분리해서 보여줍니다.
  // (캠퍼스 사진 "학교 갤러리" 섹션은 홈페이지에서는 제외 — /gallery?category=CAMPUS 에서 계속 볼 수 있습니다)
  const { data: media } = useQuery({
    queryKey: ['gallery', 'home', 'events'],
    queryFn: async () => (await galleryApi.getList({ hasEvent: true, showOnHome: true, pageSize: 4 })).data as PagedResult<GalleryItem>,
  })

  const { data: archive } = useQuery({
    queryKey: ['gallery', 'home', 'archive'],
    queryFn: async () => (await galleryApi.getList({ hasEvent: false, category: 'SCHOOL_SONG', showOnHome: true, pageSize: 4 })).data as PagedResult<GalleryItem>,
  })

  return (
    <div className="space-y-12">
      {/* 히어로 배너 - 캠퍼스 사진 슬라이드쇼 */}
      <CampusHero images={HERO_IMAGES} desktopImages={HERO_IMAGES_DESKTOP}>
        <p className="text-crimson-50/90 text-sm tracking-wide">KU CHICAGO — MIDWEST ALUMNI ASSOCIATION</p>
        <h1 className="text-2xl md:text-4xl font-bold leading-snug">
          자유·정의·진리, 시카고에 울려 퍼지는 호랑이의 기상
        </h1>
        <p className="text-crimson-50/90">1950년대부터 이어져 온 일리노이 및 미중서부 고대인의 네트워크</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/events" className="bg-crimson text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:bg-crimson-800 transition-colors">
            다가오는 행사 보기
          </Link>
          <Link to="/join" className="border-2 border-white text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-white/10 transition-colors">
            신입 교우 등록
          </Link>
        </div>
      </CampusHero>

      {/* 다가오는 주요 행사 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">다가오는 주요 행사</h2>
          <Link to="/events" className="text-sm text-crimson font-medium hover:underline">전체 일정 &rarr;</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {events?.items.map((ev) => (
            <div key={ev.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-bold text-gray-800 mb-2">{ev.title}</h3>
              <p className="text-sm text-gray-500">일시: {format(new Date(ev.eventDate), 'yyyy.MM.dd (EEE) HH:mm')}</p>
              <p className="text-sm text-gray-500 mb-3">
                장소: {ev.location}
                {ev.googleMapsUrl && (
                  <a
                    href={getGoogleMapsLink(ev.googleMapsUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-crimson hover:underline"
                  >
                    지도에서 보기 &gt;
                  </a>
                )}
              </p>
              <Link to={`/events/${ev.id}`} className="text-sm text-crimson font-medium hover:underline">
                참가 신청 (RSVP) &gt;
              </Link>
            </div>
          ))}
          {!events?.items.length && (
            <p className="text-sm text-gray-400 col-span-3">예정된 행사가 없습니다.</p>
          )}
        </div>
      </section>

      {/* 최근 행사 미디어 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">최근 행사 미디어 (사진 &amp; 영상)</h2>
          <Link to="/gallery" className="text-sm text-crimson font-medium hover:underline">갤러리 전체보기 &rarr;</Link>
        </div>
        <MediaGrid items={media?.items} onSelect={openMedia} emptyText="등록된 미디어가 없습니다." />
      </section>

      {/* 고대 자료실 (교가, 응원가 등 특정 행사와 무관한 자료) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">고대 자료실 (교가 &amp; 응원가)</h2>
          <Link to="/gallery?category=SCHOOL_SONG" className="text-sm text-crimson font-medium hover:underline">갤러리 전체보기 &rarr;</Link>
        </div>
        <MediaGrid items={archive?.items} onSelect={openMedia} emptyText="등록된 자료가 없습니다." />
      </section>

      {selectedMedia && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setSelectedMedia(null)}>
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            {selectedMedia.mediaType === 'PHOTO' ? (
              <img src={selectedMedia.mediaUrl} alt={selectedMedia.title} className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl mx-auto" />
            ) : (
              <iframe
                className="w-full aspect-video rounded-xl"
                src={getVideoEmbedUrl(selectedMedia.mediaUrl)}
                allowFullScreen
              />
            )}
            <p className="text-white text-center mt-3">{mediaLabel(selectedMedia)}</p>
            {selectedMedia.description && (
              <p className="text-gray-300 text-sm text-center mt-1">{selectedMedia.description}</p>
            )}
          </div>
        </div>
      )}

      {/* 공지사항 & 우리 이야기 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">공지사항</h2>
            <Link to="/community/notice" className="text-sm text-crimson hover:underline">더보기</Link>
          </div>
          <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200 shadow-sm">
            {notices?.items.map((a) => (
              <li key={a.id}>
                <Link to={`/community/notice/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-crimson-50">
                  <span className="truncate">{a.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">{a.authorName}</span>
                </Link>
              </li>
            ))}
            {!notices?.items.length && <li className="px-4 py-3 text-sm text-gray-400">공지사항이 없습니다.</li>}
          </ul>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">우리 이야기 (교우 소식)</h2>
            <Link to="/community/story" className="text-sm text-crimson hover:underline">더보기</Link>
          </div>
          <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200 shadow-sm">
            {stories?.items.map((a) => (
              <li key={a.id}>
                <Link to={`/community/story/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-crimson-50">
                  <span className="truncate">{a.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">{a.authorName}</span>
                </Link>
              </li>
            ))}
            {!stories?.items.length && <li className="px-4 py-3 text-sm text-gray-400">등록된 이야기가 없습니다.</li>}
          </ul>
        </div>
      </section>
    </div>
  )
}

// 행사에 연결된 미디어는 "행사명 - 사진/영상 제목" 형식으로, 행사와 무관한 자료(교가 등)는
// 제목만 표시합니다.
function mediaLabel(m: GalleryItem): string {
  return m.eventTitle ? `${m.eventTitle} - ${m.title}` : m.title
}

function MediaGrid({
  items, onSelect, emptyText,
}: { items?: GalleryItem[]; onSelect: (item: GalleryItem) => void; emptyText: string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items?.map((m) => {
        const videoThumb = m.mediaType === 'VIDEO' ? (m.thumbnailUrl || getVideoThumbnail(m.mediaUrl)) : null
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="text-left group"
          >
            <div className="rounded-xl overflow-hidden bg-gray-100 aspect-square relative">
              {m.mediaType === 'PHOTO' ? (
                <img src={m.mediaUrl} alt={m.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : videoThumb ? (
                <>
                  <img src={videoThumb} alt={m.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-white text-2xl">▶</div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm px-2 text-center">
                  ▶ {m.title}
                </div>
              )}
              <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">
                {m.mediaType === 'PHOTO' ? '사진' : '영상'}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-1.5 truncate">{mediaLabel(m)}</p>
          </button>
        )
      })}
      {!items?.length && (
        <p className="text-sm text-gray-400 col-span-4">{emptyText}</p>
      )}
    </div>
  )
}
