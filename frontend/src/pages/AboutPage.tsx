import { useQuery } from '@tanstack/react-query'
import { articlesApi } from '../api'
import type { ArticleList, PagedResult } from '../types'

const officers = [
  { role: '회장', name: '오승화 (87 독어독문)' },
  { role: '부회장', name: '정승원 (94 화학)' },
  { role: '총무', name: '두면철 (98 전산)' },
  { role: '회계', name: '민혜실 (02 식공)' },
  { role: 'YT회장', name: '신예리 (04 불문)' },
]

export default function AboutPage() {
  const { data: history } = useQuery({
    queryKey: ['articles', 'HISTORY'],
    queryFn: async () => (await articlesApi.getList({ category: 'HISTORY', pageSize: 10 })).data as PagedResult<ArticleList>,
  })

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">교우회 소개</h1>
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-3">
          <h2 className="font-bold text-crimson">회장 인사말</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            안녕하십니까, 고려대학교 미중서부 교우회 회장입니다. 1950년대부터 이어져 온 일리노이 및
            미중서부 지역 고대인의 네트워크를 소중히 이어가며, 후배 교우들의 정착과 교류를 돕고
            장학기금을 통해 다음 세대를 지원하고자 합니다. 자유·정의·진리의 정신으로 시카고에서
            만나뵙겠습니다.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">임원진 조직도</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {officers.map((o) => (
            <div key={o.role} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-xs text-crimson font-semibold mb-1">{o.role}</p>
              <p className="text-sm text-gray-700">{o.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">연혁</h2>
        <ul className="space-y-2">
          {history?.items.map((a) => (
            <li key={a.id} className="bg-white border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-700">
              {a.title}
            </li>
          ))}
          {!history?.items.length && (
            <li className="text-sm text-gray-400">등록된 연혁이 없습니다.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">교가 및 응원가 아카이브</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-600">
          교가/응원가 음원 및 가사는 준비 중입니다. 관리자 페이지에서 갤러리에 영상으로 등록하면
          이 섹션에 자동으로 노출되도록 확장할 수 있습니다.
        </div>
      </section>
    </div>
  )
}
