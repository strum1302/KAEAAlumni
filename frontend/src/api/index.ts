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
  getAll: () => api.get('/members'),
  updateRole: (id: string, role: string) => api.put(`/members/${id}/role`, { role }),
}

// ── Events API ────────────────────────────────────
export const eventsApi = {
  getList: (params?: { upcomingOnly?: boolean; page?: number; pageSize?: number }) =>
    api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: object) => api.post('/events', data),
  update: (id: string, data: object) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  getRsvps: (id: string) => api.get(`/events/${id}/rsvps`),
  createRsvp: (id: string, data: {
    guestName: string; email: string; cellPhone: string
    graduationInfo: string; additionalGuests: number; note?: string
  }) => api.post(`/events/${id}/rsvps`, data),
}

// ── Articles API ──────────────────────────────────
export const articlesApi = {
  getList: (params?: { category?: string; page?: number; pageSize?: number }) =>
    api.get('/articles', { params }),
  getById: (id: string) => api.get(`/articles/${id}`),
  create: (data: { category: string; title: string; content: string; authorName: string }) =>
    api.post('/articles', data),
  delete: (id: string) => api.delete(`/articles/${id}`),
}

// ── Gallery API ───────────────────────────────────
export const galleryApi = {
  getList: (params?: {
    mediaType?: string; eventId?: string; articleId?: string
    page?: number; pageSize?: number
  }) => api.get('/gallery', { params }),
  create: (data: {
    title: string; description?: string; mediaType: string; mediaUrl: string
    thumbnailUrl?: string; eventId?: string; articleId?: string
  }) => api.post('/gallery', data),
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
}

export default api
