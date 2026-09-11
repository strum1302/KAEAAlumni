import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Request 인터셉터 - JWT 자동 첨부
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response 인터셉터 - 토큰 만료 시 자동 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth API ──────────────────────────────────────
export const authApi = {
  register: (data: {
    name: string; email: string; password: string
    entryYear: number; major: string; degree: string
    cellPhone: string; homePhone?: string
    addressLine1?: string; addressLine2?: string
    city?: string; state: string; zipCode?: string; bio?: string
  }) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

// ── Members API ───────────────────────────────────
export const membersApi = {
  getMe: () => api.get('/members/me'),
  updateMe: (data: object) => api.put('/members/me', data),
  getAll: (includeInactive?: boolean) => api.get('/members', { params: { includeInactive } }),
  getOfficers: () => api.get('/members/officers'),
  updateRole: (id: string, role: string) => api.put(`/members/${id}/role`, { role }),
  updateOfficerTitle: (id: string, officerTitle: string | null) =>
    api.put(`/members/${id}/officer-title`, { officerTitle }),
  setActive: (id: string, isActive: boolean) => api.put(`/members/${id}/active`, { isActive }),
  updatePhoto: (id: string, photoUrl: string | null) => api.put(`/members/${id}/photo`, { photoUrl }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/members/me/password', data),
}

// ── Events API ────────────────────────────────────
export const eventsApi = {
  getList: (params?: { upcomingOnly?: boolean; year?: number; page?: number; pageSize?: number }) =>
    api.get('/events', { params }),
  getYears: () => api.get('/events/years'),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: object) => api.post('/events', data),
  update: (id: string, data: object) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  getRsvps: (id: string) => api.get(`/events/${id}/rsvps`),
  createRsvp: (id: string, data: {
    guestName: string; email: string; cellPhone: string
    graduationInfo: string; additionalGuests: number; note?: string
  }) => api.post(`/events/${id}/rsvps`, data),
  notify: (id: string, data: { target: string; subject: string; body: string }) =>
    api.post(`/events/${id}/notify`, data),
}

// ── Articles API ──────────────────────────────────
export const articlesApi = {
  getList: (params?: { category?: string; page?: number; pageSize?: number }) =>
    api.get('/articles', { params }),
  getById: (id: string) => api.get(`/articles/${id}`),
  create: (data: { category: string; title: string; content: string; authorName: string }) =>
    api.post('/articles', data),
  update: (id: string, data: { title: string; content: string }) =>
    api.put(`/articles/${id}`, data),
  delete: (id: string) => api.delete(`/articles/${id}`),
  addComment: (id: string, data: { authorName: string; content: string }) =>
    api.post(`/articles/${id}/comments`, data),
  deleteComment: (id: string, commentId: string) => api.delete(`/articles/${id}/comments/${commentId}`),
  toggleLike: (id: string) => api.post(`/articles/${id}/like`),
}

// ── Gallery API ───────────────────────────────────
export const galleryApi = {
  getList: (params?: {
    mediaType?: string; eventId?: string; articleId?: string; hasEvent?: boolean; year?: number
    showOnHome?: boolean; category?: string; page?: number; pageSize?: number; full?: boolean
  }) => api.get('/gallery', { params }),
  getYears: () => api.get('/gallery/years'),
  // 목록에서 축소본으로 받은 사진을 실제로 크게 볼 때 원본 화질을 따로 받아온다.
  getById: (id: string) => api.get(`/gallery/${id}`),
  create: (data: {
    title: string; description?: string; mediaType: string; mediaUrl: string
    thumbnailUrl?: string; eventId?: string; articleId?: string; displayOrder?: number; showOnHome?: boolean
    category?: string
  }) => api.post('/gallery', data),
  updateOrder: (id: string, displayOrder: number) => api.put(`/gallery/${id}/order`, { displayOrder }),
  updateVisibility: (id: string, showOnHome: boolean) => api.put(`/gallery/${id}/visibility`, { showOnHome }),
  delete: (id: string) => api.delete(`/gallery/${id}`),
}

// ── Payments API ──────────────────────────────────
export const paymentsApi = {
  getMine: () => api.get('/payments/me'),
  getList: (params?: { year?: number; type?: string; page?: number; pageSize?: number }) =>
    api.get('/payments', { params }),
  getSummary: (year: number) => api.get('/payments/summary', { params: { year } }),
  create: (data: object) => api.post('/payments', data),
  update: (id: string, data: object) => api.put(`/payments/${id}`, data),
  remove: (id: string) => api.delete(`/payments/${id}`),
}

// ── Email API (발송 이력) ──────────────────────────────
export const emailApi = {
  getBatches: (params?: { kind?: string; page?: number; pageSize?: number }) =>
    api.get('/email/batches', { params }),
  getSummary: () => api.get('/email/summary'),
  getBatchLogs: (id: string) => api.get(`/email/batches/${id}/logs`),
  retryFailed: (id: string) => api.post(`/email/batches/${id}/retry-failed`),
}

export default api
