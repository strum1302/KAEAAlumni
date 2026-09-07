import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      setAuth(data.member, data.accessToken, data.refreshToken)
      toast.success(`${data.member.name} 님, 환영합니다.`)
      navigate('/')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-crimson text-white flex items-center justify-center font-bold mx-auto mb-3">KU</div>
          <h1 className="text-lg font-bold text-gray-800">고려대학교 미중서부 교우회</h1>
          <p className="text-xs text-gray-500 mt-1">교우 로그인</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">이메일</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/40" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">비밀번호</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/40" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-crimson text-white font-medium py-2.5 rounded-lg hover:bg-crimson-800 transition-colors disabled:opacity-60">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">
          아직 교우 등록을 안 하셨나요?{' '}
          <Link to="/join" className="text-crimson font-medium hover:underline">신입 교우 등록</Link>
        </p>
      </div>
    </div>
  )
}
