import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { membersApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { useSort } from '../hooks/useSort'
import { fileToResizedDataUrl } from '../utils/image'
import Pagination from '../components/common/Pagination'
import SortableTh from '../components/common/SortableTh'
import type { MemberRole } from '../types'

const PAGE_SIZE = 20

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
  isActive: boolean
  photoUrl?: string | null
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
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [page, setPage] = useState(1)

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', 'all', includeInactive],
    queryFn: async () => (await membersApi.getAll(includeInactive)).data as MemberRow[],
  })

  const filtered = (members ?? []).filter((m) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  })

  const { sorted, sortKey, direction, toggleSort } = useSort(filtered, 'name')

  useEffect(() => setPage(1), [search, includeInactive])

  const totalPages = Math.max(1, Math.ceil((sorted?.length ?? 0) / PAGE_SIZE))
  const paged = (sorted ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  const handleToggleActive = async (targetMember: MemberRow) => {
    const nextActive = !targetMember.isActive

    if (targetMember.id === currentMember?.id && !nextActive) {
      toast.error('본인 계정은 이 화면에서 비활성화할 수 없습니다.')
      return
    }

    const confirmed = window.confirm(
      nextActive
        ? `${targetMember.name} (${targetMember.email}) 님을 다시 활성화하시겠습니까?`
        : `${targetMember.name} (${targetMember.email}) 님의 교우 등록을 취소(비활성화)하시겠습니까?\n` +
          '데이터는 삭제되지 않으며, 언제든 다시 활성화할 수 있습니다. 비활성화된 계정은 로그인이 차단됩니다.'
    )
    if (!confirmed) return

    setTogglingId(targetMember.id)
    try {
      await membersApi.setActive(targetMember.id, nextActive)
      toast.success(nextActive
        ? `${targetMember.name} 님이 다시 활성화되었습니다.`
        : `${targetMember.name} 님의 등록이 취소되었습니다.`)
      queryClient.invalidateQueries({ queryKey: ['members', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['members', 'officers'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '처리에 실패했습니다.')
    } finally {
      setTogglingId(null)
    }
  }

  const handlePhotoChange = async (targetMember: MemberRow, file: File) => {
    setUploadingPhotoId(targetMember.id)
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      await membersApi.updatePhoto(targetMember.id, dataUrl)
      toast.success(`${targetMember.name} 님의 사진이 업데이트되었습니다.`)
      queryClient.invalidateQueries({ queryKey: ['members', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['members', 'officers'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || '사진 업로드에 실패했습니다.')
    } finally {
      setUploadingPhotoId(null)
    }
  }

  const handleRemovePhoto = async (targetMember: MemberRow) => {
    const confirmed = window.confirm(`${targetMember.name} 님의 사진을 삭제하시겠습니까?`)
    if (!confirmed) return

    setUploadingPhotoId(targetMember.id)
    try {
      await membersApi.updatePhoto(targetMember.id, null)
      toast.success('사진이 삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['members', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['members', 'officers'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '삭제에 실패했습니다.')
    } finally {
      setUploadingPhotoId(null)
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
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            등록취소 회원 포함 전체조회
          </label>
          <input
            type="text"
            placeholder="이름 또는 이메일 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">사진</th>
              <SortableTh label="성명" active={sortKey === 'name'} direction={direction} onClick={() => toggleSort('name')} />
              <SortableTh label="이메일" active={sortKey === 'email'} direction={direction} onClick={() => toggleSort('email')} />
              <SortableTh label="학번/과" active={sortKey === 'entryYear'} direction={direction} onClick={() => toggleSort('entryYear')} />
              <th className="text-left px-4 py-2">지역</th>
              <SortableTh label="현재 권한" active={sortKey === 'role'} direction={direction} onClick={() => toggleSort('role')} />
              <th className="text-left px-4 py-2">권한 변경</th>
              <th className="text-left px-4 py-2">임원 직책</th>
              <th className="text-left px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400">불러오는 중...</td></tr>
            )}
            {!isLoading && paged.map((m) => (
              <tr key={m.id} className={m.isActive ? '' : 'bg-gray-50 text-gray-400'}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                        {m.name.slice(0, 1)}
                      </div>
                    )}
                    <label
                      className={`text-xs hover:underline whitespace-nowrap ${
                        uploadingPhotoId === m.id ? 'opacity-50 pointer-events-none text-gray-400' : 'text-crimson cursor-pointer'
                      }`}
                    >
                      {uploadingPhotoId === m.id ? '처리 중...' : m.photoUrl ? '변경' : '업로드'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (file) handlePhotoChange(m, file)
                        }}
                      />
                    </label>
                    {m.photoUrl && uploadingPhotoId !== m.id && (
                      <button onClick={() => handleRemovePhoto(m)} className="text-xs text-gray-400 hover:text-red-500">
                        삭제
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {m.name}
                  {m.id === currentMember?.id && (
                    <span className="ml-1.5 text-[11px] text-gray-400">(나)</span>
                  )}
                  {!m.isActive && (
                    <span className="ml-1.5 text-[11px] text-red-400">(등록취소됨)</span>
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
                <td className="px-4 py-2">
                  {m.id !== currentMember?.id && (
                    <button
                      onClick={() => handleToggleActive(m)}
                      disabled={togglingId === m.id}
                      className={`text-xs hover:underline disabled:opacity-50 ${
                        m.isActive ? 'text-red-500 hover:text-red-700' : 'text-crimson hover:text-crimson-800'
                      }`}
                    >
                      {togglingId === m.id ? '처리 중...' : m.isActive ? '등록취소' : '재활성화'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400">검색 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
