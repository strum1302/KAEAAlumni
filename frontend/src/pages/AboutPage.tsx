import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { articlesApi, membersApi, galleryApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from '../utils/youtube'
import type { ArticleDetail, ArticleList, GalleryItem, Officer, PagedResult } from '../types'

const HISTORY_TITLE = '교우회 연혁'

const DEFAULT_HISTORY_CONTENT = `"최대 50학번 이상 차이나는 선후배들이 객지에서 서로에게 든든한 버팀목이 되어줍니다."

고려대 중서부교우회는 1950년도 중반에 창립돼 고 민병기 초대회장 이래 현 37대 오승화 회장에 이르기까지 140여명의 동문들이 활발하게 친목을 도모하고 있습니다.

최고참인 53학번 대선배부터 젊은 15학번까지 다양한 연령층의 교우들이 모여 여름 야유회, 겨울 송년회, 총장배 골프대회, 4~10월 월별 골프대회, 고연전 골프대회 등 연례행사를 갖고 있으며 1990년대 이후 학번들이 모이는 '젊은 고대(YT)' 소모임도 있습니다.

선후배간의 끈끈한 유대관계를 가진 고대 교우회는 약 80명이 활발히 참여하고 있습니다. 모두 모국을 떠나 미국에 살면서 자유롭게 나와서 반갑게 얼굴도 보고, 도움을 주고 받으며 우정을 쌓고 있습니다. 점점 나이 들어가시는 고학번 선배님들을 더욱 챙겨드리고 소외된 부분이 없이 모두가 함께 화합할 수 있는 교우회가 되도록 계속 노력하고 있습니다. 지금처럼 단란한 교우회 속에서 선배는 후배를 사랑하고, 후배는 선배를 공경하면서 서로에게 든든한 힘이 되어주고 있습니다.`

// 임원진 카드 정렬 순서 (지정되지 않은 직책은 뒤에 등록순으로 붙습니다)
const OFFICER_ORDER = ['회장', '부회장', '총무', '회계', 'YT회장', '골프회장']

function sortOfficers(officers: Officer[]) {
  return [...officers].sort((a, b) => {
    const ai = OFFICER_ORDER.indexOf(a.officerTitle)
    const bi = OFFICER_ORDER.indexOf(b.officerTitle)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
}

function renderHistoryParagraphs(content: string) {
  return content.split(/\n\s*\n/).filter(Boolean).map((para, i) => {
    const isQuote = /^['"“]/.test(para.trim())
    return isQuote ? (
      <blockquote key={i} className="border-l-4 border-crimson pl-4 text-crimson-900 font-medium italic">
        {para.trim()}
      </blockquote>
    ) : (
      <p key={i} className="text-sm text-gray-600 leading-relaxed">{para.trim()}</p>
    )
  })
}

export default function AboutPage() {
  const { member } = useAuthStore()
  const isAdmin = member?.role === 'ADMIN'
  const queryClient = useQueryClient()

  const { data: officers } = useQuery({
    queryKey: ['members', 'officers'],
    queryFn: async () => (await membersApi.getOfficers()).data as Officer[],
  })
  const president = officers?.find((o) => o.officerTitle === '회장')

  const { data: historyList } = useQuery({
    queryKey: ['articles', 'HISTORY'],
    queryFn: async () => (await articlesApi.getList({ category: 'HISTORY', pageSize: 1 })).data as PagedResult<ArticleList>,
  })
  const historyId = historyList?.items[0]?.id

  const { data: historyDetail } = useQuery({
    queryKey: ['articles', 'HISTORY', historyId],
    queryFn: async () => (await articlesApi.getById(historyId!)).data as ArticleDetail,
    enabled: !!historyId,
  })

  // 교가/응원가 아카이브 — 특정 행사와 무관하게(hasEvent: false) 갤러리에 등록된 영상을 그대로 보여줍니다.
  const { data: archiveVideos } = useQuery({
    queryKey: ['gallery', 'about', 'archive'],
    queryFn: async () => (await galleryApi.getList({ hasEvent: false, mediaType: 'VIDEO', pageSize: 12 })).data as PagedResult<GalleryItem>,
  })
  const [selectedVideo, setSelectedVideo] = useState<GalleryItem | null>(null)

  const [editingHistory, setEditingHistory] = useState(false)
  const [historyDraft, setHistoryDraft] = useState('')
  const [savingHistory, setSavingHistory] = useState(false)

  useEffect(() => {
    if (!editingHistory) setHistoryDraft(historyDetail?.content ?? DEFAULT_HISTORY_CONTENT)
  }, [historyDetail, editingHistory])

  const saveHistory = async () => {
    setSavingHistory(true)
    try {
      if (historyId) {
        await articlesApi.update(historyId, { title: HISTORY_TITLE, content: historyDraft })
      } else {
        await articlesApi.create({
          category: 'HISTORY', title: HISTORY_TITLE, content: historyDraft,
          authorName: member?.name || '관리자',
        })
      }
      toast.success('연혁이 저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['articles', 'HISTORY'] })
      setEditingHistory(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '저장에 실패했습니다.')
    } finally {
      setSavingHistory(false)
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">교우회 소개</h1>
        {president?.photoUrl && (
          <div className="flex justify-center mb-4">
            <img
              src={president.photoUrl}
              alt={president.name}
              className="max-w-full h-auto rounded-lg border border-gray-100"
            />
          </div>
        )}
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
        <div className="flex flex-wrap justify-center gap-4">
          {sortOfficers(officers ?? []).map((o) => (
            <div key={o.id} className="bg-white border border-gray-100 rounded-xl p-4 text-center w-[200px]">
              {o.photoUrl ? (
                <div className="w-[200px] h-[250px] rounded-lg bg-gray-50 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                  <img
                    src={o.photoUrl}
                    alt={o.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-[200px] h-[250px] rounded-lg bg-crimson-50 text-crimson font-bold text-4xl flex items-center justify-center mx-auto mb-2">
                  {o.name.slice(0, 1)}
                </div>
              )}
              <p className="text-xs text-crimson font-semibold mb-1">{o.officerTitle}</p>
              <p className="text-sm text-gray-700">{o.name} ({o.entryYear} {o.major})</p>
            </div>
          ))}
          {!officers?.length && (
            <p className="text-sm text-gray-400 text-center py-4">
              등록된 임원 정보가 없습니다.
              {isAdmin && ' 교우 권한 관리 페이지에서 회원의 임원 직책을 지정할 수 있습니다.'}
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">연혁</h2>
          {isAdmin && !editingHistory && (
            <button
              onClick={() => setEditingHistory(true)}
              className="text-sm text-crimson font-medium px-3 py-1.5 bg-crimson-50 rounded hover:bg-crimson-100"
            >
              연혁 편집
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
          {!editingHistory ? (
            renderHistoryParagraphs(historyDetail?.content ?? DEFAULT_HISTORY_CONTENT)
          ) : (
            <div className="space-y-3">
              <textarea
                value={historyDraft}
                onChange={(e) => setHistoryDraft(e.target.value)}
                rows={14}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm leading-relaxed"
              />
              <p className="text-xs text-gray-400">문단 사이는 빈 줄로 구분하세요. 따옴표로 시작하는 문단은 인용구로 강조됩니다.</p>
              <div className="flex gap-2">
                <button
                  onClick={saveHistory}
                  disabled={savingHistory}
                  className="bg-crimson text-white text-sm px-4 py-2 rounded-lg hover:bg-crimson-800 disabled:opacity-50"
                >
                  {savingHistory ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => { setEditingHistory(false); setHistoryDraft(historyDetail?.content ?? DEFAULT_HISTORY_CONTENT) }}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">교가 및 응원가 아카이브</h2>
        {archiveVideos?.items.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {archiveVideos.items.map((v) => {
              const thumb = v.thumbnailUrl || getYouTubeThumbnail(v.mediaUrl)
              return (
                <button key={v.id} onClick={() => setSelectedVideo(v)} className="text-left group">
                  <div className="rounded-xl overflow-hidden bg-gray-100 aspect-video relative">
                    {thumb ? (
                      <>
                        <img src={thumb} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-white text-2xl">▶</div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm px-2 text-center">
                        ▶ {v.title}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1.5 truncate">{v.title}</p>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-600">
            교가/응원가 영상은 준비 중입니다. 갤러리 메뉴에서 "연결된 행사 없음"으로 영상을 등록하면
            이 섹션에 자동으로 노출됩니다.
          </div>
        )}
      </section>

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setSelectedVideo(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <iframe
              className="w-full aspect-video rounded-xl"
              src={getYouTubeEmbedUrl(selectedVideo.mediaUrl)}
              allowFullScreen
            />
            <p className="text-white text-center mt-3">{selectedVideo.title}</p>
            {selectedVideo.description && (
              <p className="text-gray-300 text-sm text-center mt-1">{selectedVideo.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
