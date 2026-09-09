import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useState, useRef, useEffect } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

export default function Layout() {
  const { isAuthenticated, member, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const adminMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLinks = [
    { to: '/', label: '홈' },
    { to: '/about', label: '교우회 소개' },
    { to: '/events', label: '행사' },
    { to: '/gallery', label: '갤러리' },
    { to: '/community/all', label: '게시판' },
    { to: '/giving', label: '회비안내' },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const canManage = member?.role === 'OFFICER' || member?.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* 상단 정보 바 */}
      <div className="bg-crimson-900 text-crimson-50/80 text-xs py-1.5 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span>문의: info@kuchicago.org</span>
          <span>Chicago &amp; Midwest, USA</span>
        </div>
      </div>

      {/* 헤더 */}
      <header className="bg-white border-b-2 border-crimson shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* 로고 */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Korea University" className="h-11 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-gray-800 leading-tight">고려대학교 미중서부 교우회</h1>
              <p className="text-xs text-gray-500 leading-tight">Korea University Alumni Association — KU Chicago</p>
            </div>
          </Link>

          {/* 데스크탑 네비게이션 */}
          <nav className="hidden lg:flex items-center gap-1 flex-shrink-0">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded whitespace-nowrap ${
                  isActive(link.to)
                    ? 'text-crimson border-b-2 border-crimson'
                    : 'text-gray-700 hover:text-crimson hover:bg-crimson-50'
                }`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 로그인/등록 */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {(canManage || member?.role === 'ADMIN') && (
                  <div className="relative" ref={adminMenuRef}>
                    <button onClick={() => setAdminMenuOpen(v => !v)}
                      className="flex items-center gap-1 text-sm text-crimson font-medium px-3 py-1.5 bg-crimson-50 rounded hover:bg-crimson-100 whitespace-nowrap">
                      관리 메뉴
                      <ChevronDown size={14} className={adminMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                    {adminMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
                        {canManage && (
                          <Link to="/admin/payments" onClick={() => setAdminMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-crimson-50 hover:text-crimson whitespace-nowrap">
                            관리자 대시보드
                          </Link>
                        )}
                        {canManage && (
                          <Link to="/admin/emails" onClick={() => setAdminMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-crimson-50 hover:text-crimson whitespace-nowrap">
                            메일 발송 내역
                          </Link>
                        )}
                        {member?.role === 'ADMIN' && (
                          <Link to="/admin/members" onClick={() => setAdminMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-crimson-50 hover:text-crimson whitespace-nowrap">
                            교우 권한 관리
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <Link to="/profile" className="text-sm text-gray-700 hover:text-crimson font-medium whitespace-nowrap">
                  {member?.name} 님
                </Link>
                <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 whitespace-nowrap">
                  로그아웃
                </button>
              </div>
            ) : (
              <>
                <Link to="/login"
                  className="text-sm text-gray-600 hover:text-crimson font-medium px-3 py-1.5 whitespace-nowrap">
                  로그인
                </Link>
                <Link to="/join"
                  className="bg-crimson text-white text-sm px-4 py-1.5 rounded hover:bg-crimson-800 transition-colors font-medium whitespace-nowrap">
                  교우 등록
                </Link>
              </>
            )}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 px-3 rounded text-sm font-medium ${
                    isActive(link.to)
                      ? 'text-crimson bg-crimson-50'
                      : 'text-gray-700 hover:text-crimson hover:bg-crimson-50'
                  }`}>
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && (
                <div className="pt-2 mt-1 border-t border-gray-100 space-y-1">
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 px-3 rounded text-sm font-medium text-gray-700 hover:text-crimson hover:bg-crimson-50">
                    {member?.name} 님 (마이페이지)
                  </Link>
                  {canManage && (
                    <Link to="/admin/payments" onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 px-3 rounded text-sm font-medium text-crimson bg-crimson-50">
                      관리자 대시보드
                    </Link>
                  )}
                  {canManage && (
                    <Link to="/admin/emails" onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 px-3 rounded text-sm font-medium text-crimson bg-crimson-50">
                      메일 발송 내역
                    </Link>
                  )}
                  {member?.role === 'ADMIN' && (
                    <Link to="/admin/members" onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 px-3 rounded text-sm font-medium text-crimson bg-crimson-50">
                      교우 권한 관리
                    </Link>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {isAuthenticated ? (
                  <button onClick={handleLogout}
                    className="flex-1 text-center py-2 text-red-500 text-sm">
                    로그아웃
                  </button>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center py-2 border border-gray-300 rounded text-sm">
                      로그인
                    </Link>
                    <Link to="/join" onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center py-2 bg-crimson text-white rounded text-sm">
                      교우 등록
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 페이지 콘텐츠 */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* 푸터 */}
      <footer className="bg-crimson-900 text-crimson-50/80 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <h4 className="text-white font-bold mb-3">KU Chicago</h4>
              <p className="text-sm">Korea University Midwest Alumni Association</p>
              <p className="text-sm mt-1">고려대학교 미중서부 교우회</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">바로가기</h4>
              <ul className="space-y-1 text-sm">
                <li><Link to="/about" className="hover:text-white">교우회 소개</Link></li>
                <li><Link to="/events" className="hover:text-white">행사 및 모임</Link></li>
                <li><Link to="/community/notice" className="hover:text-white">공지사항</Link></li>
                <li><Link to="/giving" className="hover:text-white">회비 및 후원</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">연락처</h4>
              <p className="text-sm">Email: info@kuchicago.org</p>
              <p className="text-sm mt-1">Zelle Tag: kuaa1905</p>
              <p className="text-sm mt-1">Chicago &amp; Midwest, USA</p>
            </div>
          </div>
          <div className="border-t border-crimson-800 pt-4 text-center text-sm">
            © 2026 KU Chicago Alumni Association. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
