import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

// 테이블 헤딩 클릭 정렬용 훅. 문자열/숫자/날짜(ISO 문자열) 필드를 알아서 비교합니다.
export function useSort<T>(items: T[] | undefined, defaultKey?: keyof T, defaultDirection: SortDirection = 'asc') {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultKey ?? null)
  const [direction, setDirection] = useState<SortDirection>(defaultDirection)

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDirection('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!items || !sortKey) return items
    const copy = [...items]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return direction === 'asc' ? av - bv : bv - av
      }
      if (typeof av === 'boolean' && typeof bv === 'boolean') {
        return direction === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
      }
      const as = String(av).toLowerCase()
      const bs = String(bv).toLowerCase()
      if (as < bs) return direction === 'asc' ? -1 : 1
      if (as > bs) return direction === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [items, sortKey, direction])

  return { sorted, sortKey, direction, toggleSort }
}
