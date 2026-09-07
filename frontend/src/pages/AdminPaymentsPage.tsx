import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { paymentsApi, membersApi } from '../api'
import { useAuthStore } from '../store/authStore'
import type { Payment, PaymentSummary, PagedResult } from '../types'

const currentYear = new Date().getFullYear()
const YEARS = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]

export default function AdminPaymentsPage() {
  const { member } = useAuthStore()
  const isAdmin = member?.role === 'ADMIN'
  const queryClient = useQueryClient()
  const [year, setYear] = useState(currentYear)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MEMBERSHIP_FEE' | 'DONATION' | 'EVENT_FEE'>('ALL')
  const [showAdd, setShowAdd] = useState(false)

  const { data: summary } = useQuery({
    queryKey: ['payments', 'summary', year],
    queryFn: async () => (await paymentsApi.getSummary(year)).data as PaymentSummary,
  })

  const { data: payments, refetch } = useQuery({
    queryKey: ['payments', 'list', year, typeFilter],
    queryFn: async () => (await paymentsApi.getList({
      year, type: typeFilter === 'ALL' ? undefined : typeFilter, pageSize: 100,
    })).data as PagedResult<Payment>,
  })

  const methodLabel = (m: string) => ({ ZELLE: 'ZELLE', VENMO: 'VENMO', CHECK: 'CHECK', CREDIT_CARD: 'CREDIT CARD', CASH: 'CASH' }[m] || m)
  const typeLabel = (t: string) => ({ MEMBERSHIP_FEE: '연회비', DONATION: '도네이션', EVENT_FEE: '행사비' }[t] || t)

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
        <SummaryCard label="장학기금 / 도네이션" value={summary?.donationTotal} />
      </div>

      {/* 필터 + 등록 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {(['ALL', 'MEMBERSHIP_FEE', 'DONATION', 'EVENT_FEE'] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium ${
                typeFilter === t ? 'bg-crimson text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t === 'ALL' ? '전체 내역' : typeLabel(t)}
            </button>
          ))}
        </div>
        {isAdmin && (
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
              <th className="text-left px-4 py-2">납부일자</th>
              <th className="text-left px-4 py-2">교우 성명 (학번/과)</th>
              <th className="text-left px-4 py-2">구분</th>
              <th className="text-left px-4 py-2">금액</th>
              <th className="text-left px-4 py-2">납부수단/Ref#</th>
              <th className="text-left px-4 py-2">세부목적/메모</th>
              <th className="text-left px-4 py-2">영수증</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments?.items.map((p) => (
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
              </tr>
            ))}
            {!payments?.items.length && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">납부 내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddPaymentModal onClose={() => setShowAdd(false)} onCreated={() => {
          refetch()
          queryClient.invalidateQueries({ queryKey: ['payments', 'summary'] })
        }} />
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

function AddPaymentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [members, setMembers] = useState<Array<{ id: string; name: string; entryYear: number; major: string }>>([])
  const [form, setForm] = useState({
    memberId: '', paymentType: 'MEMBERSHIP_FEE', targetYear: String(currentYear),
    amount: '', paymentMethod: 'ZELLE', transactionId: '', purposeDetail: '', receiptIssued: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    membersApi.getAll().then((res) => setMembers(res.data)).catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await paymentsApi.create({
        ...form,
        targetYear: Number(form.targetYear),
        amount: Number(form.amount),
      })
      toast.success('수납 내역이 등록되었습니다.')
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-800">수납 내역 등록</h3>
        <form onSubmit={submit} className="space-y-3">
          <select required value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">교우 선택</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.entryYear} {m.major})</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="MEMBERSHIP_FEE">연회비</option>
              <option value="DONATION">도네이션</option>
              <option value="EVENT_FEE">행사비</option>
            </select>
            <input required type="number" placeholder="연도" value={form.targetYear}
              onChange={(e) => setForm({ ...form, targetYear: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" step="0.01" placeholder="금액 ($)" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="ZELLE">Zelle</option>
              <option value="VENMO">Venmo</option>
              <option value="CHECK">Check</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="CASH">Cash</option>
            </select>
          </div>
          <input placeholder="Ref# / 수표번호" value={form.transactionId}
            onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="세부목적/메모" value={form.purposeDetail}
            onChange={(e) => setForm({ ...form, purposeDetail: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.receiptIssued}
              onChange={(e) => setForm({ ...form, receiptIssued: e.target.checked })} />
            영수증 발행 완료
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">취소</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-crimson text-white rounded-lg py-2 text-sm disabled:opacity-60">
              {saving ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
