import { useQuery } from '@tanstack/react-query'
import { articlesApi } from '../api'
import type { ArticleList, PagedResult } from '../types'

const officers = [
  { role: '회장', name: '오승화 (87 독어독문)' },
  { role: '부회장', name: '정승원 (94 화학)' },
  { role: '총무', name: '두명철 (98 컴퓨터교육)' },
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
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
          <blockquote className="border-l-4 border-crimson pl-4 text-crimson-900 font-medium italic">
            "최대 50학번 이상 차이나는 선후배들이 객지에서 서로에게 든든한 버팀목이 되어줍니다."
          </blockquote>
          <p className="text-sm text-gray-600 leading-relaxed">
            고려대 중서부교우회는 1950년도 중반에 창립돼 고 민병기 초대회장 이래 현 37대 오승화
            회장에 이르기까지 140여명의 동문들이 활발하게 친목을 도모하고 있습니다.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            최고참인 53학번 대선배부터 젊은 15학번까지 다양한 연령층의 교우들이 모여 여름 야유회,
            겨울 송년회, 총장배 골프대회, 4~10월 월별 골프대회, 고연전 골프대회 등 연례행사를 갖고
            있으며 1990년대 이후 학번들이 모이는 '젊은 고대(YT)' 소모임도 있습니다.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            선후배간의 끈끈한 유대관계를 가진 고대 교우회는 약 80명이 활발히 참여하고 있습니다.
            모두 모국을 떠나 미국에 살면서 자유롭게 나와서 반갑게 얼굴도 보고, 도움을 주고 받으며
            우정을 쌓고 있습니다. 점점 나이 들어가시는 고학번 선배님들을 더욱 챙겨드리고 소외된
            부분이 없이 모두가 함께 화합할 수 있는 교우회가 되도록 계속 노력하고 있습니다. 지금처럼
            단란한 교우회 속에서 선배는 후배를 사랑하고, 후배는 선배를 공경하면서 서로에게 든든한
            힘이 되어주고 있습니다.
          </p>
        </div>

        {!!history?.items.length && (
          <ul className="space-y-2 mt-4">
            {history.items.map((a) => (
              <li key={a.id} className="bg-white border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-700">
                {a.title}
              </li>
            ))}
          </ul>
        )}
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
