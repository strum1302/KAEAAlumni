import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { eventsApi, articlesApi, galleryApi } from '../api'
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from '../utils/youtube'
import type { EventList, ArticleList, GalleryItem, PagedResult } from '../types'

export default function HomePage() {
  const [selectedMedia, setSelectedMedia] = useState<GalleryItem | null>(null)

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

  // 행사에 연결된 사진/영상("최근 행사 미디어")과, 특정 행사와 무관한 교가·응원가 등
  // 고대 자료("고대 자료실")를 서로 섞이지 않도록 분리해서 보여줍니다.
  const { data: media } = useQuery({
    queryKey: ['gallery', 'home', 'events'],
    queryFn: async () => (await galleryApi.getList({ hasEvent: true, pageSize: 4 })).data as PagedResult<GalleryItem>,
  })

  const { data: archive } = useQuery({
    queryKey: ['gallery', 'home', 'archive'],
    queryFn: async () => (await galleryApi.getList({ hasEvent: false, pageSize: 4 })).data as PagedResult<GalleryItem>,
  })

  return (
    <div className="space-y-12">
      {/* 히어로 배너 */}
      <section className="relative bg-crimson text-white rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-crimson-900/80 to-crimson/70" />
        <div className="relative px-6 py-16 md:py-20 text-center space-y-4">
          <p className="text-crimson-50/90 text-sm tracking-wide">KU CHICAGO — MIDWEST ALUMNI ASSOCIATION</p>
          <h1 className="text-2xl md:text-4xl font-bold leading-snug">
            자유·정의·진리, 시카고에 울려 퍼지는 호랑이의 기상
          </h1>
          <p className="text-crimson-50/90">1950년대부터 이어져 온 일리노이 및 미중서부 고대인의 네트워크</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/events" className="bg-white text-crimson font-semibold px-5 py-2.5 rounded-lg hover:bg-crimson-50 transition-colors">
              다가오는 행사 보기
            </Link>
            <Link to="/join" className="border border-white/70 font-semibold px-5 py-2.5 rounded-lg hover:bg-white/10 transition-colors">
              신입 교우 등록
            </Link>
          </div>
        </div>
      </section>

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
              <p className="text-sm text-gray-500">일시: {format(new Date(ev.eventDate), 'yyyy.MM.dd')}</p>
              <p className="text-sm text-gray-500 mb-3">장소: {ev.location}</p>
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
        <MediaGrid items={media?.items} onSelect={setSelectedMedia} emptyText="등록된 미디어가 없습니다." />
      </section>

      {/* 고대 자료실 (교가, 응원가 등 특정 행사와 무관한 자료) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">고대 자료실 (교가 &amp; 응원가)</h2>
          <Link to="/gallery" className="text-sm text-crimson font-medium hover:underline">갤러리 전체보기 &rarr;</Link>
        </div>
        <MediaGrid items={archive?.items} onSelect={setSelectedMedia} emptyText="등록된 자료가 없습니다." />
      </section>

      {selectedMedia && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setSelectedMedia(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            {selectedMedia.mediaType === 'PHOTO' ? (
              <img src={selectedMedia.mediaUrl} alt={selectedMedia.title} className="w-full rounded-xl" />
            ) : (
              <iframe
                className="w-full aspect-video rounded-xl"
                src={getYouTubeEmbedUrl(selectedMedia.mediaUrl)}
                allowFullScreen
              />
            )}
            <p className="text-white text-center mt-3">{selectedMedia.title}</p>
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
          <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-100">
            {notices?.items.map((a) => (
              <li key={a.id}>
                <Link to={`/community/notice/${a.id}`} className="block px-4 py-3 text-sm text-gray-700 hover:bg-crimson-50">
                  {a.title}
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
          <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-100">
            {stories?.items.map((a) => (
              <li key={a.id}>
                <Link to={`/community/story/${a.id}`} className="block px-4 py-3 text-sm text-gray-700 hover:bg-crimson-50">
                  {a.title}
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

function MediaGrid({
  items, onSelect, emptyText,
}: { items?: GalleryItem[]; onSelect: (item: GalleryItem) => void; emptyText: string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items?.map((m) => {
        const videoThumb = m.mediaType === 'VIDEO' ? (m.thumbnailUrl || getYouTubeThumbnail(m.mediaUrl)) : null
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="text-left rounded-xl overflow-hidden bg-gray-100 aspect-square relative group"
          >
            {m.mediaType === 'PHOTO' ? (
              <img src={m.mediaUrl} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : videoThumb ? (
              <>
                <img src={videoThumb} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
          </button>
        )
      })}
      {!items?.length && (
        <p className="text-sm text-gray-400 col-span-4">{emptyText}</p>
      )}
    </div>
  )
}
