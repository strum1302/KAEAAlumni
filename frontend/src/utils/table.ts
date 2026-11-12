// 게시글 본문 안의 표를 다루는 유틸리티입니다.
// 표는 본문 텍스트 안에 아래처럼 사람이 읽고 고칠 수 있는 형태로 저장됩니다.
//
//   [[table]]
//   이름 | 학번 | 금액
//   홍길동 | 85 | $100
//   [[/table]]
//
// - 첫 줄은 제목 행으로 표시됩니다.
// - 칸 구분은 " | " 입니다. 칸 안의 "|" 문자는 전각 "｜"로 바꿔서 저장합니다.
// - 칸 안의 줄바꿈은 "<br>"로 저장하고, 화면에서는 줄바꿈으로 보여줍니다.

export const TABLE_OPEN = '[[table]]'
export const TABLE_CLOSE = '[[/table]]'

const MAX_ROWS = 200
const MAX_COLS = 30

function sanitizeCell(text: string): string {
  return text
    .replace(/ /g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('<br>')
    .replace(/\|/g, '｜')
    .replace(/\[\[|\]\]/g, (m) => (m === '[[' ? '[ [' : '] ]')) // 마커와 충돌 방지
    .trim()
}

// 2차원 배열을 [[table]] 마커 텍스트로 변환합니다. 앞뒤에 줄바꿈을 붙여 문단과 분리합니다.
export function serializeTable(rows: string[][]): string {
  const colCount = Math.min(MAX_COLS, Math.max(...rows.map((r) => r.length)))
  const lines = rows.slice(0, MAX_ROWS).map((r) => {
    const cells = Array.from({ length: colCount }, (_, i) => sanitizeCell(r[i] ?? ''))
    return cells.join(' | ')
  })
  return `\n${TABLE_OPEN}\n${lines.join('\n')}\n${TABLE_CLOSE}\n`
}

// [[table]] ~ [[/table]] 사이의 텍스트를 2차원 배열로 되돌립니다.
export function parseTableBody(body: string): string[][] {
  const rows = body
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => line.split('|').map((c) => c.trim()))
  const colCount = Math.max(0, ...rows.map((r) => r.length))
  return rows.map((r) => Array.from({ length: colCount }, (_, i) => r[i] ?? ''))
}

// 비어 있는 행이나 열을 정리합니다 (엑셀에서 빈 칸까지 같이 복사되는 경우 대비).
function trimEmpty(rows: string[][]): string[][] {
  const nonEmptyRows = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (nonEmptyRows.length === 0) return []
  const colCount = Math.max(...nonEmptyRows.map((r) => r.length))
  let lastCol = colCount - 1
  while (lastCol > 0 && nonEmptyRows.every((r) => !(r[lastCol] ?? '').trim())) lastCol--
  return nonEmptyRows.map((r) => Array.from({ length: lastCol + 1 }, (_, i) => r[i] ?? ''))
}

// 엑셀/구글시트/워드에서 복사한 HTML의 <table>을 읽습니다. 병합된 칸(colspan)은 빈 칸으로 채워 열을 맞춥니다.
function parseHtmlTable(html: string): string[][] | null {
  if (!/<table/i.test(html)) return null
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('table')
  if (!table) return null
  const rows: string[][] = []
  table.querySelectorAll('tr').forEach((tr) => {
    const row: string[] = []
    tr.querySelectorAll('th, td').forEach((cell) => {
      // HTML 소스의 줄바꿈/들여쓰기는 공백으로 합치고, <br>만 실제 줄바꿈으로 살립니다.
      cell.querySelectorAll('br').forEach((br) => br.replaceWith('\u0000'))
      row.push((cell.textContent ?? '').replace(/\s+/g, ' ').replace(/\u0000/g, '\n').trim())
      const span = Number(cell.getAttribute('colspan') || 1)
      for (let i = 1; i < span && i < MAX_COLS; i++) row.push('')
    })
    rows.push(row)
  })
  return rows
}

// 탭으로 구분된 텍스트(엑셀 기본 복사 형식)를 읽습니다. 따옴표로 감싼 칸(칸 안 줄바꿈)도 처리합니다.
function parseTsv(text: string): string[][] | null {
  if (!text.includes('\t')) return null
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const s = text.replace(/\r\n?/g, '\n')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else cell += ch
    } else if (ch === '"' && cell === '') inQuotes = true
    else if (ch === '\t') { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row) }
  return rows
}

// 클립보드 내용이 표라면 2차원 배열을, 아니면 null을 반환합니다.
// 칸이 2개 이상인 행이 하나도 없으면 일반 텍스트로 보고 그대로 붙여넣게 둡니다.
export function tableFromClipboard(data: DataTransfer): string[][] | null {
  const html = data.getData('text/html')
  const plain = data.getData('text/plain')
  // 엑셀은 탭 구분 텍스트를 항상 함께 넣어주므로 그쪽을 우선 사용하고, 탭이 없을 때만 HTML 표를 읽습니다.
  const rows = parseTsv(plain) || (html ? parseHtmlTable(html) : null)
  if (!rows) return null
  const cleaned = trimEmpty(rows)
  if (cleaned.length === 0 || cleaned.every((r) => r.length < 2)) return null
  // 탭이 하나 섞인 한 줄짜리 일반 글은 표로 바꾸지 않습니다 (엑셀에서 복사한 경우는 HTML에 <table>이 있음).
  if (cleaned.length < 2 && !/<table/i.test(html)) return null
  return cleaned
}

// 빈 표 틀을 만듭니다 (첫 줄은 제목 행).
export function emptyTable(rowCount: number, colCount: number): string[][] {
  return Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: colCount }, (_, c) => (r === 0 ? `제목${c + 1}` : ''))
  )
}
