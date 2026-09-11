import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { emailApi } from '../api'
import Pagination from '../components/common/Pagination'
import type { EmailBatch, EmailLog, PagedResult } from '../types'

const PAGE_SIZE = 20

const KIND_FILTERS = ['ALL', 'EVENT_NOTIFY', 'ARTICLE_NOTIFY', 'SIGNUP_VERIFY', 'PASSWORD_RESET', 'MANUAL'] as const
const KIND_LABELS: Record<string, string> = {
  EVENT_NOTIFY: '행사 공지', ARTICLE_NOTIFY: '게시글 알림', SIGNUP_VERIFY: '가입 인증',
  PASSWORD_RESET: '비밀번호 재설정', MANUAL: '수동 발송',
}
const TARGET_LABELS: Record<string, string> = { ALL: '전체 회원', RSVP: '신청자만', NOT_RSVP: '미신청자만' }
const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기중', SENDING: '발송중', COMPLETED: '완료', COMPLETED_WITH_ERRORS: '일부 실패',
}
const statusColor = (s: string) =>
  s === 'COMPLETED' ? 'text-green-600' : s === 'COMPLETED_WITH_ERRORS' ? 'text-amber-600' : 'text-gray-500'

export default function AdminEmailPage() {
  const [kindFilter, setKindFilter] = useState<(typeof KIND_FILTERS)[number]>('ALL')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: summary } = useQuery({
    queryKey: ['email', 'summary'],
    queryFn: async () => (await emailApi.getSummary()).data as { sentThisMonth: number },
  })

  const { data: batches, refetch } = useQuery({
    queryKey: ['email', 'batches', kindFilter, page],
    queryFn: async () => (await emailApi.getBatches({
      kind: kindFilter === 'ALL' ? undefined : kindFilter, page, pageSize: PAGE_SIZE,
    })).data as PagedResult<EmailBatch>,
    // 발송중/대기중인 배치가 있으면 짧은 주기로, 없어도 새 배치(다른 화면/다른 관리자가
    // 방금 보낸 메일)가 뜰 수 있으니 느슨한 주기로 계속 다시 조회한다.
    // (재발송 버튼을 눌러도 그 순간 한 번만 새로고침하고 끝이라, 실제로는 처리가 끝나거나
    // 새로 발송됐는데도 화면이 그대로 멈춰 있는 것처럼 보이는 문제가 있었다.)
    refetchInterval: (query) => {
      const data = query.state.data as PagedResult<EmailBatch> | undefined
      const inProgress = data?.items.some((b) => b.status === 'PENDING' || b.status === 'SENDING')
      return inProgress ? 1500 : 7000
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">메일 발송 내역</h1>
      <p className="text-sm text-gray-500 mb-6">
        행사 공지, 게시글 알림, 가입 인증, 비밀번호 재설정 등 시스템에서 나간 모든 메일의 발송 여부와 시각을 확인할 수 있습니다.
      </p>

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 inline-block">
        <p className="text-xs text-gray-500 mb-1">이번 달 누적 발송 (성공)</p>
        <p className="text-2xl font-bold text-crimson">{summary?.sentThisMonth ?? 0}건</p>
        <p className="text-xs text-gray-400 mt-1">무료 SMTP 서비스는 월 발송 한도가 있으니 참고하세요.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {KIND_FILTERS.map((k) => (
          <button key={k} onClick={() => { setKindFilter(k); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-full font-medium ${
              kindFilter === k ? 'bg-crimson text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {k === 'ALL' ? '전체' : KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">발송일시</th>
              <th className="text-left px-4 py-2">종류</th>
              <th className="text-left px-4 py-2">대상</th>
              <th className="text-left px-4 py-2">제목</th>
              <th className="text-left px-4 py-2">수신자</th>
              <th className="text-left px-4 py-2">상태</th>
              <th className="text-left px-4 py-2">발송자</th>
              <th className="text-left px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {batches?.items.map((b) => (
              <BatchRow key={b.id} batch={b} expanded={expanded === b.id}
                onToggle={() => setExpanded(expanded === b.id ? null : b.id)}
                onRetried={() => refetch()} />
            ))}
            {!batches?.items.length && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">발송 내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={batches?.totalPages ?? 1} onChange={setPage} />
    </div>
  )
}

function BatchRow({ batch, expanded, onToggle, onRetried }: {
  batch: EmailBatch; expanded: boolean; onToggle: () => void; onRetried: () => void
}) {
  const { data: logs } = useQuery({
    queryKey: ['email', 'logs', batch.id],
    queryFn: async () => (await emailApi.getBatchLogs(batch.id)).data as EmailLog[],
    enabled: expanded,
    refetchInterval: (query) => {
      const data = query.state.data as EmailLog[] | undefined
      return data?.some((l) => l.status === 'PENDING') ? 1500 : false
    },
  })

  const retry = async () => {
    try {
      const res = await emailApi.retryFailed(batch.id)
      toast.success(res.data.message)
      onRetried()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '재발송 요청에 실패했습니다.')
    }
  }

  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <td className="px-4 py-2 whitespace-nowrap">{format(new Date(batch.createdAt), 'yyyy-MM-dd HH:mm')}</td>
        <td className="px-4 py-2">{KIND_LABELS[batch.kind] || batch.kind}{batch.eventTitle ? ` · ${batch.eventTitle}` : ''}</td>
        <td className="px-4 py-2">{batch.target ? TARGET_LABELS[batch.target] || batch.target : '-'}</td>
        <td className="px-4 py-2 max-w-[220px] truncate">{batch.subject}</td>
        <td className="px-4 py-2 whitespace-nowrap">
          {batch.recipientCount}명 (성공 {batch.successCount}{batch.failureCount > 0 ? `, 실패 ${batch.failureCount}` : ''})
        </td>
        <td className={`px-4 py-2 font-medium ${statusColor(batch.status)}`}>{STATUS_LABELS[batch.status] || batch.status}</td>
        <td className="px-4 py-2 whitespace-nowrap">{batch.sentByName || '-'}</td>
        <td className="px-4 py-2 text-crimson text-xs whitespace-nowrap">{expanded ? '접기 ▲' : '상세 ▼'}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">수신자별 발송 결과</p>
              {batch.failureCount > 0 && (
                <button onClick={(e) => { e.stopPropagation(); retry() }}
                  className="text-xs text-crimson font-medium border border-crimson rounded-lg px-3 py-1 hover:bg-crimson-50">
                  실패 {batch.failureCount}건 재발송
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {logs?.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-xs bg-white rounded px-3 py-1.5 border border-gray-100">
                  <span className="text-gray-600">{l.toName ? `${l.toName} · ` : ''}{l.toEmail}</span>
                  <span className={l.status === 'FAILED' ? 'text-red-500' : l.status === 'SENT' ? 'text-green-600' : 'text-gray-400'}>
                    {l.status === 'FAILED' ? `실패${l.errorMessage ? `: ${l.errorMessage}` : ''}` : l.status === 'SENT' ? '발송완료' : '대기중'}
                  </span>
                </div>
              ))}
              {!logs?.length && <p className="text-xs text-gray-400">불러오는 중...</p>}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
