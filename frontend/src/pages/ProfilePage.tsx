import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { paymentsApi } from '../api'
import { useAuthStore } from '../store/authStore'

export default function ProfilePage() {
  const { member } = useAuthStore()

  const { data: payments } = useQuery({
    queryKey: ['payments', 'me'],
    queryFn: async () => (await paymentsApi.getMine()).data as Array<{
      id: string; paymentDate: string; paymentType: string; targetYear: number
      amount: number; paymentMethod: string; receiptIssued: boolean
    }>,
  })

  if (!member) return null

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">마이페이지</h1>
        <p className="text-sm text-gray-500">{member.role} · {member.entryYear} {member.major}</p>
      </div>

      <section className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-bold text-crimson mb-4">내 정보</h2>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-gray-500">성명</dt><dd className="text-gray-800">{member.name}</dd>
          <dt className="text-gray-500">이메일</dt><dd className="text-gray-800">{member.email}</dd>
          <dt className="text-gray-500">휴대전화</dt><dd className="text-gray-800">{member.cellPhone}</dd>
          <dt className="text-gray-500">일반전화</dt><dd className="text-gray-800">{member.homePhone || '-'}</dd>
          <dt className="text-gray-500">주소</dt>
          <dd className="text-gray-800">
            {[member.addressLine1, member.addressLine2, member.city, member.state, member.zipCode]
              .filter(Boolean).join(', ') || '-'}
          </dd>
        </dl>
      </section>

      <section>
        <h2 className="font-bold text-gray-800 mb-3">내 납부 내역</h2>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">납부일</th>
                <th className="text-left px-4 py-2">구분</th>
                <th className="text-left px-4 py-2">금액</th>
                <th className="text-left px-4 py-2">영수증</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments?.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{format(new Date(p.paymentDate), 'yyyy.MM.dd')}</td>
                  <td className="px-4 py-2">{p.paymentType === 'MEMBERSHIP_FEE' ? '연회비' : p.paymentType === 'DONATION' ? '도네이션' : '행사비'}</td>
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
      </section>
    </div>
  )
}
