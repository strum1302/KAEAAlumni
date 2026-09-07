import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member } from '../types'

interface AuthState {
  member: Member | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (member: Member, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      member: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (member, accessToken, refreshToken) =>
        set({ member, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({ member: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'kaea-alumni-auth',
      partialize: (state) => ({
        member: state.member,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
