import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { articlesApi } from '../api'
import type { ArticleDetail } from '../types'

export default function ArticleDetailPage() {
  const { category, id } = useParams<{ category: string; id: string }>()

  const { data: article } = useQuery({
    queryKey: ['article', id],
    queryFn: async () => (await articlesApi.getById(id!)).data as ArticleDetail,
    enabled: !!id,
  })

  if (!article) return <p className="text-sm text-gray-400">불러오는 중...</p>

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/community/${category}`} className="text-sm text-crimson hover:underline">&larr; 목록으로</Link>
      <h1 className="text-2xl font-bold text-gray-800 mt-3 mb-2">{article.title}</h1>
      <div className="text-xs text-gray-400 mb-6">
        {article.authorName} · {format(new Date(article.createdAt), 'yyyy.MM.dd')} · 조회 {article.viewCount}
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-6 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
        {article.content}
      </div>

      {article.galleryItems.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-gray-800 mb-3">첨부 미디어</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {article.galleryItems.map((g) => (
              <div key={g.id} className="rounded-xl overflow-hidden bg-gray-100">
                {g.mediaType === 'PHOTO' ? (
                  <img src={g.mediaUrl} alt={g.title} className="w-full aspect-video object-cover" />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center bg-gray-800 text-white text-sm">▶ {g.title}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
