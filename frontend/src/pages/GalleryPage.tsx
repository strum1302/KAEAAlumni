import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { galleryApi } from '../api'
import Pagination from '../components/common/Pagination'
import type { GalleryItem, PagedResult } from '../types'

const PAGE_SIZE = 16

export default function GalleryPage() {
  const [filter, setFilter] = useState<'ALL' | 'PHOTO' | 'VIDEO'>('ALL')
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [filter])

  const { data } = useQuery({
    queryKey: ['gallery', 'all', filter, page],
    queryFn: async () => (await galleryApi.getList({
      mediaType: filter === 'ALL' ? undefined : filter, page, pageSize: PAGE_SIZE,
    })).data as PagedResult<GalleryItem>,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">미디어 갤러리</h1>
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
        {data?.items.map((item) => (
          <button key={item.id} onClick={() => setSelected(item)} className="text-left group">
            <div className="rounded-xl overflow-hidden bg-gray-100 aspect-square relative">
              {item.mediaType === 'PHOTO' ? (
                <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
        ))}
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
          </div>
        </div>
      )}
    </div>
  )
}
