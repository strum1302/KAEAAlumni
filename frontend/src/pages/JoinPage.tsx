import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'

const US_STATES = ['IL', 'IN', 'WI', 'MI', 'OH', 'MN', 'IA', 'MO', 'KY']

export default function JoinPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    entryYear: '', major: '', degree: '학사',
    cellPhone: '', homePhone: '',
    addressLine1: '', addressLine2: '', city: '', state: 'IL', zipCode: '',
    bio: '',
  })

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.register({
        ...form,
        entryYear: Number(form.entryYear),
      })
      setAuth(data.member, data.accessToken, data.refreshToken)
      toast.success('교우 명부 등록이 완료되었습니다. 환영합니다! 입력하신 이메일로 인증 메일을 보내드렸습니다.')
      navigate('/')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '등록에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">신입 교우 명부 등록</h1>
      <p className="text-sm text-gray-500 mb-6">Membership Registration</p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-8">
        {/* 기본 인적사항 */}
        <fieldset className="space-y-4">
          <legend className="font-bold text-crimson mb-2">기본 인적사항</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="교우 성명" required value={form.name} onChange={(v) => update('name', v)} />
            <Field label="이메일" type="email" required value={form.email} onChange={(v) => update('email', v)} />
            <Field label="비밀번호" type="password" required value={form.password} onChange={(v) => update('password', v)} />
            <Field label="입학년도(학번)" type="number" required value={form.entryYear} onChange={(v) => update('entryYear', v)} placeholder="예: 1983" />
            <Field label="학과" required value={form.major} onChange={(v) => update('major', v)} />
            <div>
              <label className="block text-sm text-gray-600 mb-1">학위</label>
              <select value={form.degree} onChange={(e) => update('degree', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="학사">학사</option>
                <option value="석사">석사</option>
                <option value="박사">박사</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* 연락처 정보 */}
        <fieldset className="space-y-4">
          <legend className="font-bold text-crimson mb-2">연락처 정보</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="휴대전화 (Cell Phone, SMS 수신)" required value={form.cellPhone} onChange={(v) => update('cellPhone', v)} placeholder="847-555-0101" />
            <Field label="일반전화 (Home Phone, 선택)" value={form.homePhone} onChange={(v) => update('homePhone', v)} placeholder="847-555-0102" />
          </div>
        </fieldset>

        {/* 거주지 주소 */}
        <fieldset className="space-y-4">
          <legend className="font-bold text-crimson mb-2">거주지 주소 (U.S. Address)</legend>
          <Field label="기본 주소 (Street)" value={form.addressLine1} onChange={(v) => update('addressLine1', v)} placeholder="1234 Milwaukee Ave" />
          <Field label="상세 주소 (Apt/Suite)" value={form.addressLine2} onChange={(v) => update('addressLine2', v)} placeholder="Apt 204" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="도시 (City)" value={form.city} onChange={(v) => update('city', v)} />
            <div>
              <label className="block text-sm text-gray-600 mb-1">주 (State)</label>
              <select value={form.state} onChange={(e) => update('state', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Field label="우편번호 (Zip Code)" value={form.zipCode} onChange={(v) => update('zipCode', v)} />
          </div>
        </fieldset>

        <div>
          <label className="block text-sm text-gray-600 mb-1">교우회 메모</label>
          <textarea rows={3} value={form.bio} onChange={(e) => update('bio', e.target.value)}
            placeholder="미중서부 교우회 선후배님들과의 활발한 교류를 희망합니다."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-crimson text-white font-semibold py-3 rounded-lg hover:bg-crimson-800 transition-colors disabled:opacity-60">
          {loading ? '등록 중...' : '교우 명부 등록 완료'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        {label}{required && <span className="text-crimson">*</span>}
      </label>
      <input type={type} required={required} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/40" />
    </div>
  )
}
