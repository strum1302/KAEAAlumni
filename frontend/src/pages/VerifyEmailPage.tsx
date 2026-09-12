import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api'

// 이메일 인증(참고용) 링크 처리 페이지 - /verify-email?token=...
// 인증에 실패하거나 링크를 클릭하지 않아도 로그인/사이트 이용에는 제한이 없습니다.
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('유효하지 않은 인증 링크입니다.')
      return
    }
    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('이메일 인증이 완료되었습니다.')
      })
      .catch((err: any) => {
        setStatus('error')
        setMessage(err?.response?.data?.message || '인증에 실패했습니다. 링크가 만료되었거나 이미 사용되었을 수 있습니다.')
      })
  }, [token])

  return (
    <div className="max-w-md mx-auto py-16">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
        {status === 'loading' && <p className="text-gray-500">이메일 인증을 처리하는 중입니다...</p>}
        {status === 'success' && (
          <>
            <h1 className="text-xl font-bold text-crimson mb-2">인증 완료</h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-xl font-bold text-gray-800 mb-2">인증 실패</h1>
            <p className="text-sm text-gray-600 mb-6">
              {message}
              <br />
              인증하지 않으셔도 사이트 이용에는 제한이 없으니, 마이페이지에서 언제든 다시 시도하실 수 있습니다.
            </p>
          </>
        )}
        <Link
          to="/"
          className="inline-block bg-crimson text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-crimson-800"
        >
          홈으로 이동
        </Link>
      </div>
    </div>
  )
}
