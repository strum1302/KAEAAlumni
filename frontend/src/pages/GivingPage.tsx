import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function GivingPage() {
  const { member } = useAuthStore()
  const canManage = member?.role === 'OFFICER' || member?.role === 'ADMIN'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">회비 및 후원</h1>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-crimson">연회비 &amp; 후원 안내</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          정기 연회비는 매년 갱신되며, 미중서부 교우회 도네이션은 언제든지 후원하실 수 있습니다.
          납부 후 아래 정보와 함께 관리자에게 알려주시면 확인 후 영수증을 발행해 드립니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-crimson-50 rounded-lg p-4">
            <p className="font-semibold text-crimson mb-1">Zelle</p>
            <p className="text-gray-600">Zelle Tag: <span className="font-medium">kuaa1905</span></p>
          </div>
          <div className="bg-crimson-50 rounded-lg p-4">
            <p className="font-semibold text-crimson mb-1">Check (수표)</p>
            <p className="text-gray-600">KU Chicago Alumni Association 앞으로 발행</p>
          </div>
        </div>
      </div>

      {canManage && (
        <Link to="/admin/payments"
          className="block text-center bg-crimson text-white font-medium py-3 rounded-lg hover:bg-crimson-800 transition-colors">
          수납/도네이션 현황 관리자 대시보드 &rarr;
        </Link>
      )}
    </div>
  )
}
