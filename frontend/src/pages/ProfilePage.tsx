import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { authApi, membersApi, paymentsApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { useSort } from '../hooks/useSort'
import Pagination from '../components/common/Pagination'
import SortableTh from '../components/common/SortableTh'

const US_STATES = ['IL', 'IN', 'WI', 'MI', 'OH', 'MN', 'IA', 'MO', 'KY']
const PAGE_SIZE = 10

export default function ProfilePage() {
  const { member, setMember } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [changingPassword, setChangingPassword] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [resending, setResending] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [form, setForm] = useState({
    cellPhone: member?.cellPhone || '',
    homePhone: member?.homePhone || '',
    addressLine1: member?.addressLine1 || '',
    addressLine2: member?.addressLine2 || '',
    city: member?.city || '',
    state: member?.state || 'IL',
    zipCode: member?.zipCode || '',
    bio: member?.bio || '',
  })

  const { data: payments } = useQuery({
    queryKey: ['payments', 'me'],
    queryFn: async () => (await paymentsApi.getMine()).data as Array<{
      id: string; paymentDate: string; paymentType: string; targetYear: number
      amount: number; paymentMethod: string; receiptIssued: boolean
    }>,
  })

  const { sorted: sortedPayments, sortKey: paymentSortKey, direction: paymentDirection, toggleSort: togglePaymentSort } =
    useSort(payments, 'paymentDate', 'desc')
  const paymentsTotalPages = Math.max(1, Math.ceil((sortedPayments?.length ?? 0) / PAGE_SIZE))
  const pagedPayments = (sortedPayments ?? []).slice((paymentsPage - 1) * PAGE_SIZE, paymentsPage * PAGE_SIZE)

  if (!member) return null

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const startEditing = () => {
    setForm({
      cellPhone: member.cellPhone || '',
      homePhone: member.homePhone || '',
      addressLine1: member.addressLine1 || '',
      addressLine2: member.addressLine2 || '',
      city: member.city || '',
      state: member.state || 'IL',
      zipCode: member.zipCode || '',
      bio: member.bio || '',
    })
    setEditing(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await membersApi.updateMe(form)
      setMember({ ...member, ...form })
      toast.success('내 정보가 수정되었습니다.')
      setEditing(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true)
    try {
      await authApi.resendVerification()
      toast.success('인증 메일을 다시 보냈습니다.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '인증 메일 재전송에 실패했습니다.')
    } finally {
      setResending(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.')
      return
    }
    setPwSaving(true)
    try {
      await membersApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('비밀번호가 변경되었습니다.')
      setChangingPassword(false)
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">마이페이지</h1>
        <p className="text-sm text-gray-500">{member.role} · {member.entryYear} {member.major}</p>
      </div>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-crimson">내 정보</h2>
          {!editing && (
            <button
              onClick={startEditing}
              className="text-sm text-crimson font-medium px-3 py-1.5 bg-crimson-50 rounded hover:bg-crimson-100"
            >
              정보 수정
            </button>
          )}
        </div>

        {!editing ? (
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-gray-500">성명</dt><dd className="text-gray-800">{member.name}</dd>
            <dt className="text-gray-500">이메일</dt>
            <dd className="text-gray-800">
              {member.email}
              {member.emailVerified ? (
                <span className="ml-2 text-xs text-green-600 font-medium">인증완료</span>
              ) : (
                <span className="ml-2 text-xs text-amber-600 font-medium">
                  미인증 ·{' '}
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="underline hover:no-underline disabled:opacity-50"
                  >
                    {resending ? '전송 중...' : '인증 메일 재전송'}
                  </button>
                </span>
              )}
            </dd>
            <dt className="text-gray-500">휴대전화</dt><dd className="text-gray-800">{member.cellPhone}</dd>
            <dt className="text-gray-500">일반전화</dt><dd className="text-gray-800">{member.homePhone || '-'}</dd>
            <dt className="text-gray-500">주소</dt>
            <dd className="text-gray-800">
              {[member.addressLine1, member.addressLine2, member.city, member.state, member.zipCode]
                .filter(Boolean).join(', ') || '-'}
            </dd>
            <dt className="text-gray-500">자기소개</dt><dd className="text-gray-800">{member.bio || '-'}</dd>
          </dl>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 text-xs text-gray-400">
                성명·이메일은 관리자에게 문의해주세요.
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">휴대전화</label>
                <input
                  value={form.cellPhone}
                  onChange={(e) => update('cellPhone', e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">일반전화</label>
                <input
                  value={form.homePhone}
                  onChange={(e) => update('homePhone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">주소 1</label>
                <input
                  value={form.addressLine1}
                  onChange={(e) => update('addressLine1', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">주소 2</label>
                <input
                  value={form.addressLine2}
                  onChange={(e) => update('addressLine2', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">도시</label>
                <input
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">주(State)</label>
                <select
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">우편번호</label>
                <input
                  value={form.zipCode}
                  onChange={(e) => update('zipCode', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">자기소개</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-crimson text-white text-sm px-4 py-2 rounded-lg hover:bg-crimson-800 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-crimson">비밀번호 변경</h2>
          {!changingPassword && (
            <button
              onClick={() => setChangingPassword(true)}
              className="text-sm text-crimson font-medium px-3 py-1.5 bg-crimson-50 rounded hover:bg-crimson-100"
            >
              비밀번호 변경
            </button>
          )}
        </div>

        {changingPassword && (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">현재 비밀번호</label>
              <input
                type="password" required value={pwForm.currentPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">새 비밀번호 (8자 이상)</label>
              <input
                type="password" required minLength={8} value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">새 비밀번호 확인</label>
              <input
                type="password" required value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={pwSaving}
                className="bg-crimson text-white text-sm px-4 py-2 rounded-lg hover:bg-crimson-800 disabled:opacity-50"
              >
                {pwSaving ? '변경 중...' : '변경'}
              </button>
              <button
                type="button"
                onClick={() => { setChangingPassword(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) }}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </section>

      <section>
        <h2 className="font-bold text-gray-800 mb-3">내 납부 내역</h2>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <SortableTh label="납부일" active={paymentSortKey === 'paymentDate'} direction={paymentDirection} onClick={() => togglePaymentSort('paymentDate')} />
                <SortableTh label="구분" active={paymentSortKey === 'paymentType'} direction={paymentDirection} onClick={() => togglePaymentSort('paymentType')} />
                <SortableTh label="금액" active={paymentSortKey === 'amount'} direction={paymentDirection} onClick={() => togglePaymentSort('amount')} />
                <SortableTh label="영수증" active={paymentSortKey === 'receiptIssued'} direction={paymentDirection} onClick={() => togglePaymentSort('receiptIssued')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedPayments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{format(new Date(p.paymentDate), 'yyyy.MM.dd')}</td>
                  <td className="px-4 py-2">
                    {p.paymentType === 'MEMBERSHIP_FEE' ? '연회비'
                      : p.paymentType === 'MEMBERSHIP_FEE_BOARD' ? '연회비+이사회비'
                      : p.paymentType === 'DONATION' ? '도네이션'
                      : p.paymentType === 'EVENT_FEE' ? '행사비' : '통합(과거자료)'}
                  </td>
                  <td className="px-4 py-2">${p.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">{p.receiptIssued ? '완료' : '미발행'}</td>
                </tr>
              ))}
              {!payments?.length && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">납부 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={paymentsPage} totalPages={paymentsTotalPages} onChange={setPaymentsPage} />
      </section>
    </div>
  )
}
