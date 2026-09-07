import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

import Layout from './components/common/Layout'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import GalleryPage from './pages/GalleryPage'
import CommunityPage from './pages/CommunityPage'
import ArticleDetailPage from './pages/ArticleDetailPage'
import JoinPage from './pages/JoinPage'
import GivingPage from './pages/GivingPage'
import AdminPaymentsPage from './pages/AdminPaymentsPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
})

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, member } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && (!member || !roles.includes(member.role))) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* 로그인 - 독립 페이지 */}
          <Route path="/login" element={<LoginPage />} />

          {/* Layout 적용 - 모든 페이지 */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/community/:category" element={<CommunityPage />} />
            <Route path="/community/:category/:id" element={<ArticleDetailPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/giving" element={<GivingPage />} />
            <Route path="/profile" element={
              <PrivateRoute><ProfilePage /></PrivateRoute>
            } />
            <Route path="/admin/payments" element={
              <PrivateRoute roles={['OFFICER', 'ADMIN']}><AdminPaymentsPage /></PrivateRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
