import { useState, type RefObject } from 'react'
import toast from 'react-hot-toast'
import { emptyTable, serializeTable, tableFromClipboard } from '../../utils/table'

// 게시글 작성/수정 textarea에 표 기능을 붙여주는 훅입니다.
// - onPaste: 엑셀/구글시트/워드에서 복사한 표를 [[table]] 마커로 자동 변환해 커서 위치에 넣습니다.
// - insertTable: 빈 표 틀을 커서 위치에 넣습니다.
export function useTableEditing(
  ref: RefObject<HTMLTextAreaElement>,
  value: string,
  setValue: (next: string) => void,
) {
  const insertAtCursor = (text: string) => {
    const el = ref.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? start
    setValue(value.slice(0, start) + text + value.slice(end))
    requestAnimationFrame(() => {
      const pos = start + text.length
      el?.focus()
      el?.setSelectionRange(pos, pos)
    })
  }

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const rows = tableFromClipboard(e.clipboardData)
    if (!rows) return // 일반 텍스트는 기본 동작대로 붙여넣기
    e.preventDefault()
    insertAtCursor(serializeTable(rows))
    toast.success(`표(${rows.length}행 × ${rows[0].length}열)로 붙여넣었습니다.`)
  }

  const insertTable = (rowCount: number, colCount: number) =>
    insertAtCursor(serializeTable(emptyTable(rowCount, colCount)))

  return { onPaste, insertTable }
}

// "+ 표 삽입" 버튼. 누르면 행/열 수를 고르는 작은 창이 열립니다.
export function TableInsertButton({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="text-xs font-medium border border-crimson text-crimson rounded-lg px-3 py-1.5 hover:bg-crimson-50">
        + 표 삽입
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <label className="flex items-center gap-1">
              행
              <select value={rows} onChange={(e) => setRows(Number(e.target.value))}
                className="border border-gray-300 rounded px-1 py-0.5">
                {Array.from({ length: 19 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1">
              열
              <select value={cols} onChange={(e) => setCols(Number(e.target.value))}
                className="border border-gray-300 rounded px-1 py-0.5">
                {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-snug">
            첫 줄은 제목 행입니다. 칸은 <code>|</code> 로 구분해서 입력하세요.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { onInsert(rows, cols); setOpen(false) }}
              className="bg-crimson text-white text-xs font-medium px-3 py-1 rounded hover:bg-crimson-800">
              삽입
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
