import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { paymentsApi, membersApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { useSort } from '../hooks/useSort'
import Pagination from '../components/common/Pagination'
import SortableTh from '../components/common/SortableTh'
import type { Payment, PaymentSummary, PagedResult } from '../types'

const currentYear = new Date().getFullYear()
const YEARS = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]
const PAGE_SIZE = 20

export default function AdminPaymentsPage() {
  const { member } = useAuthStore()
  const isAdmin = member?.role === 'ADMIN'
  // 회계 담당(임원 직책 "회계")도 관리자와 동일하게 회비 수납 내역을 등록/수정/삭제할 수 있습니다.
  const canManagePayments = isAdmin || member?.officerTitle === '회계'
  const queryClient = useQueryClient()
  const [year, setYear] = useState(currentYear)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MEMBERSHIP_FEE' | 'MEMBERSHIP_FEE_BOARD' | 'DONATION' | 'EVENT_FEE' | 'GENERAL'>('ALL')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [year, typeFilter])

  const { data: summary } = useQuery({
    queryKey: ['payments', 'summary', year],
    queryFn: async () => (await paymentsApi.getSummary(year)).data as PaymentSummary,
  })

  const { data: payments, refetch } = useQuery({
    queryKey: ['payments', 'list', year, typeFilter, page],
    queryFn: async () => (await paymentsApi.getList({
      year, type: typeFilter === 'ALL' ? undefined : typeFilter, page, pageSize: PAGE_SIZE,
    })).data as PagedResult<Payment>,
  })

  const { sorted, sortKey, direction, toggleSort } = useSort(payments?.items, 'paymentDate', 'desc')

  const refreshAll = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['payments', 'summary'] })
  }

  const handleDelete = async (p: Payment) => {
    if (!confirm(`${p.memberName}님의 ${format(new Date(p.paymentDate), 'yyyy-MM-dd')} 납부 내역($${p.amount.toFixed(2)})을 삭제할까요?`)) return
    try {
      await paymentsApi.remove(p.id)
      toast.success('삭제되었습니다.')
      refreshAll()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '삭제에 실패했습니다.')
    }
  }

  const methodLabel = (m: string) => ({ ZELLE: 'ZELLE', VENMO: 'VENMO', CHECK: 'CHECK', CREDIT_CARD: 'CREDIT CARD', CASH: 'CASH' }[m] || m)
  const typeLabel = (t: string) => ({
    MEMBERSHIP_FEE: '연회비', MEMBERSHIP_FEE_BOARD: '연회비+이사회비', DONATION: '도네이션', EVENT_FEE: '행사비',
    GENERAL: '통합(과거자료)',
  }[t] || t)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{year} 회계연도 회비 및 도네이션 납부 현황</h1>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label={`총 수납액 (${year})`} value={summary?.totalAmount} />
        <SummaryCard label="정기 연회비 합계" value={summary?.membershipFeeTotal} />
        <SummaryCard label="도네이션 합계" value={summary?.donationTotal} />
      </div>

      {/* 필터 + 등록 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {(['ALL', 'MEMBERSHIP_FEE', 'MEMBERSHIP_FEE_BOARD', 'DONATION', 'EVENT_FEE', 'GENERAL'] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                typeFilter === t ? 'bg-crimson text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t === 'ALL' ? '전체 내역' : typeLabel(t)}
            </button>
          ))}
        </div>
        {canManagePayments && (
          <button onClick={() => setShowAdd(true)}
            className="text-sm text-white bg-crimson font-medium rounded-lg px-4 py-2 hover:bg-crimson-800">
            + 수납 내역 등록
          </button>
        )}
      </div>

      {/* 내역 테이블 */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <SortableTh label="납부일자" active={sortKey === 'paymentDate'} direction={direction} onClick={() => toggleSort('paymentDate')} />
              <SortableTh label="교우 성명 (학번/과)" active={sortKey === 'memberName'} direction={direction} onClick={() => toggleSort('memberName')} />
              <SortableTh label="구분" active={sortKey === 'paymentType'} direction={direction} onClick={() => toggleSort('paymentType')} />
              <SortableTh label="금액" active={sortKey === 'amount'} direction={direction} onClick={() => toggleSort('amount')} />
              <th className="text-left px-4 py-2">납부수단/Ref#</th>
              <th className="text-left px-4 py-2">세부목적/메모</th>
              <SortableTh label="영수증" active={sortKey === 'receiptIssued'} direction={direction} onClick={() => toggleSort('receiptIssued')} />
              {canManagePayments && <th className="text-left px-4 py-2">관리</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted?.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 whitespace-nowrap">{format(new Date(p.paymentDate), 'yyyy-MM-dd')}</td>
                <td className="px-4 py-2">{p.memberName} ({p.graduationInfo})</td>
                <td className="px-4 py-2">{typeLabel(p.paymentType)}</td>
                <td className="px-4 py-2">${p.amount.toFixed(2)}</td>
                <td className="px-4 py-2">{methodLabel(p.paymentMethod)}{p.transactionId ? ` (#${p.transactionId})` : ''}</td>
                <td className="px-4 py-2">{p.purposeDetail || '-'}</td>
                <td className="px-4 py-2">
                  <span className={p.receiptIssued ? 'text-green-600' : 'text-amber-600'}>
                    {p.receiptIssued ? '완료' : '미발행'}
                  </span>
                </td>
                {canManagePayments && (
                  <td className="px-4 py-2 whitespace-nowrap">
                    <button onClick={() => setEditing(p)} className="text-xs text-crimson font-medium hover:underline mr-3">수정</button>
                    <button onClick={() => handleDelete(p)} className="text-xs text-gray-400 font-medium hover:underline hover:text-red-500">삭제</button>
                  </td>
                )}
              </tr>
            ))}
            {!payments?.items.length && (
              <tr><td colSpan={canManagePayments ? 8 : 7} className="px-4 py-6 text-center text-gray-400">납부 내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={payments?.totalPages ?? 1} onChange={setPage} />

      {showAdd && (
        <PaymentModal onClose={() => setShowAdd(false)} onSaved={() => { refreshAll(); setShowAdd(false) }} />
      )}
      {editing && (
        <PaymentModal payment={editing} onClose={() => setEditing(null)} onSaved={() => { refreshAll(); setEditing(null) }} />
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-crimson">${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
    </div>
  )
}

// 등록/수정 공용 모달. payment가 있으면 수정 모드, 없으면 등록 모드로 동작합니다.
function PaymentModal({ payment, onClose, onSaved }: { payment?: Payment; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!payment
  const [members, setMembers] = useState<Array<{ id: string; name: string; entryYear: number; major: string }>>([])
  const [form, setForm] = useState({
    memberId: payment?.memberId ?? '',
    paymentType: payment?.paymentType ?? 'MEMBERSHIP_FEE',
    targetYear: String(payment?.targetYear ?? currentYear),
    amount: payment ? String(payment.amount) : '',
    paymentDate: payment ? format(new Date(payment.paymentDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: payment?.paymentMethod ?? 'ZELLE',
    transactionId: payment?.transactionId ?? '',
    purposeDetail: payment?.purposeDetail ?? '',
    receiptIssued: payment?.receiptIssued ?? false,
    paymentStatus: payment?.paymentStatus ?? 'COMPLETED',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    membersApi.getAll().then((res) => setMembers(res.data)).catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        targetYear: Number(form.targetYear),
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
      }
      if (isEdit) {
        await paymentsApi.update(payment!.id, payload)
        toast.success('수정되었습니다.')
      } else {
        await paymentsApi.create(payload)
        toast.success('수납 내역이 등록되었습니다.')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || (isEdit ? '수정에 실패했습니다.' : '등록에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-800">{isEdit ? '수납 내역 수정' : '수납 내역 등록'}</h3>
        <form onSubmit={submit} className="space-y-3">
          <select required value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">교우 선택</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.entryYear} {m.major})</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.paymentType} onChange={(e) => {
              const paymentType = e.target.value as typeof form.paymentType
              // 연회비/연회비+이사회비 선택 시 기본 금액을 채워주되, 이미 금액을 입력했다면 덮어쓰지 않습니다.
              const defaultAmount = paymentType === 'MEMBERSHIP_FEE' ? '100' : paymentType === 'MEMBERSHIP_FEE_BOARD' ? '200' : ''
              setForm((f) => ({ ...f, paymentType, amount: f.amount || defaultAmount }))
            }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="MEMBERSHIP_FEE">연회비 ($100)</option>
              <option value="MEMBERSHIP_FEE_BOARD">연회비+이사회비 ($200)</option>
              <option value="DONATION">도네이션</option>
              <option value="EVENT_FEE">행사비</option>
              <option value="GENERAL">통합(과거자료 - 항목 구분 어려운 경우)</option>
            </select>
            <input required type="number" placeholder="연도" value={form.targetYear}
              onChange={(e) => setForm({ ...form, targetYear: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" step="0.01" placeholder="금액 ($)" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input required type="date" value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="ZELLE">Zelle</option>
            <option value="VENMO">Venmo</option>
            <option value="CHECK">Check</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="CASH">Cash</option>
          </select>
          <input placeholder="Ref# / 수표번호" value={form.transactionId}
            onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="세부목적/메모" value={form.purposeDetail}
            onChange={(e) => setForm({ ...form, purposeDetail: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          {isEdit && (
            <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="PENDING">대기중</option>
              <option value="COMPLETED">완료</option>
              <option value="CANCELLED">취소됨</option>
            </select>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.receiptIssued}
              onChange={(e) => setForm({ ...form, receiptIssued: e.target.checked })} />
            영수증 발행 완료
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">취소</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-crimson text-white rounded-lg py-2 text-sm disabled:opacity-60">
              {saving ? '저장 중...' : isEdit ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
