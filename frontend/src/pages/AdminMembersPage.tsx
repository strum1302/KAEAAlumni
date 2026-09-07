import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { membersApi } from '../api'
import { useAuthStore } from '../store/authStore'
import type { MemberRole } from '../types'

interface MemberRow {
  id: string
  name: string
  email: string
  entryYear: number
  major: string
  degree: string
  city?: string
  state?: string
  role: MemberRole
  officerTitle?: string | null
  createdAt: string
}

const ROLES: MemberRole[] = ['MEMBER', 'YT', 'OFFICER', 'ADMIN']
const OFFICER_TITLES = ['회장', '부회장', '총무', '회계', 'YT회장', '골프회장']

const roleLabel = (r: MemberRole) =>
  ({ MEMBER: '일반회원', YT: 'Young Tigers', OFFICER: '임원', ADMIN: '관리자' }[r])

const roleBadgeClass = (r: MemberRole) =>
  ({
    MEMBER: 'bg-gray-100 text-gray-600',
    YT: 'bg-blue-50 text-blue-600',
    OFFICER: 'bg-amber-50 text-amber-700',
    ADMIN: 'bg-crimson-50 text-crimson',
  }[r])

export default function AdminMembersPage() {
  const { member: currentMember } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingOfficerId, setSavingOfficerId] = useState<string | null>(null)

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', 'all'],
    queryFn: async () => (await membersApi.getAll()).data as MemberRow[],
  })

  const filtered = (members ?? []).filter((m) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  })

  const handleRoleChange = async (targetMember: MemberRow, newRole: MemberRole) => {
    if (newRole === targetMember.role) return

    if (targetMember.id === currentMember?.id && newRole !== 'ADMIN') {
      const confirmed = window.confirm(
        '본인의 관리자 권한을 해제하려고 합니다. 계속하시겠습니까? (해제하면 이 페이지에 다시 못 들어올 수 있습니다)'
      )
      if (!confirmed) return
    }

    setSavingId(targetMember.id)
    try {
      await membersApi.updateRole(targetMember.id, newRole)
      toast.success(`${targetMember.name} 님의 권한이 ${roleLabel(newRole)}(으)로 변경되었습니다.`)
      queryClient.invalidateQueries({ queryKey: ['members', 'all'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '권한 변경에 실패했습니다.')
    } finally {
      setSavingId(null)
    }
  }

  const handleOfficerTitleChange = async (targetMember: MemberRow, value: string) => {
    let officerTitle: string | null = value

    if (value === '__custom__') {
      const input = window.prompt('직책을 입력하세요 (비워두면 취소)', targetMember.officerTitle || '')
      if (!input) return
      officerTitle = input.trim()
    } else if (value === '') {
      officerTitle = null
    }

    if ((officerTitle || '') === (targetMember.officerTitle || '')) return

    setSavingOfficerId(targetMember.id)
    try {
      await membersApi.updateOfficerTitle(targetMember.id, officerTitle)
      toast.success(`${targetMember.name} 님의 직책이 변경되었습니다.`)
      queryClient.invalidateQueries({ queryKey: ['members', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['members', 'officers'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '직책 변경에 실패했습니다.')
    } finally {
      setSavingOfficerId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">교우 권한 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            회원의 역할(MEMBER / YT / OFFICER / ADMIN)을 변경할 수 있습니다.
          </p>
        </div>
        <input
          type="text"
          placeholder="이름 또는 이메일 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">성명</th>
              <th className="text-left px-4 py-2">이메일</th>
              <th className="text-left px-4 py-2">학번/과</th>
              <th className="text-left px-4 py-2">지역</th>
              <th className="text-left px-4 py-2">현재 권한</th>
              <th className="text-left px-4 py-2">권한 변경</th>
              <th className="text-left px-4 py-2">임원 직책</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">불러오는 중...</td></tr>
            )}
            {!isLoading && filtered.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2 whitespace-nowrap">
                  {m.name}
                  {m.id === currentMember?.id && (
                    <span className="ml-1.5 text-[11px] text-gray-400">(나)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500">{m.email}</td>
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{m.entryYear} {m.major}</td>
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{[m.city, m.state].filter(Boolean).join(', ') || '-'}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeClass(m.role)}`}>
                    {roleLabel(m.role)}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={m.role}
                    disabled={savingId === m.id}
                    onChange={(e) => handleRoleChange(m, e.target.value as MemberRole)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{roleLabel(r)}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={m.officerTitle && !OFFICER_TITLES.includes(m.officerTitle) ? '__custom__' : (m.officerTitle || '')}
                    disabled={savingOfficerId === m.id}
                    onChange={(e) => handleOfficerTitleChange(m, e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
                  >
                    <option value="">없음</option>
                    {OFFICER_TITLES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="__custom__">
                      {m.officerTitle && !OFFICER_TITLES.includes(m.officerTitle) ? m.officerTitle : '직접 입력...'}
                    </option>
                  </select>
                </td>
              </tr>
            ))}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">검색 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
