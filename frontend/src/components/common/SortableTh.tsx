interface SortableThProps {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
  className?: string
}

// 클릭하면 정렬되는 테이블 헤딩(<th>). 현재 정렬 기준 컬럼에는 화살표를 표시합니다.
export default function SortableTh({ label, active, direction, onClick, className = '' }: SortableThProps) {
  return (
    <th className={`text-left px-4 py-2 select-none ${className}`}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 font-medium hover:text-gray-700 ${active ? 'text-gray-700' : ''}`}
      >
        {label}
        <span className={`text-[10px] ${active ? 'opacity-100' : 'opacity-30'}`}>
          {active && direction === 'desc' ? '▼' : '▲'}
        </span>
      </button>
    </th>
  )
}
