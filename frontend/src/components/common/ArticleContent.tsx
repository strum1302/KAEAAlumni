import { Fragment } from 'react'
import { parseTableBody } from '../../utils/table'

// 게시글 본문을 렌더링합니다.
// - "사진 삽입" 버튼으로 끼워넣은 [[img:data:...]] 마커 → 실제 <img>
// - 엑셀 붙여넣기 / "표 삽입" 버튼으로 넣은 [[table]] ... [[/table]] 블록 → 테두리 있는 표
const BLOCK_MARKER = /\[\[img:(data:[^\]]+)\]\]|\[\[table\]\]([\s\S]*?)\[\[\/table\]\]/g

type Block =
  | { type: 'text'; value: string }
  | { type: 'img'; value: string }
  | { type: 'table'; rows: string[][] }

function toBlocks(content: string): Block[] {
  const blocks: Block[] = []
  let last = 0
  for (const m of content.matchAll(BLOCK_MARKER)) {
    const idx = m.index ?? 0
    if (idx > last) blocks.push({ type: 'text', value: content.slice(last, idx) })
    if (m[1]) blocks.push({ type: 'img', value: m[1] })
    else blocks.push({ type: 'table', rows: parseTableBody(m[2] ?? '') })
    last = idx + m[0].length
  }
  if (last < content.length) blocks.push({ type: 'text', value: content.slice(last) })
  return blocks
}

// 칸 안의 <br> 표기를 줄바꿈으로 보여줍니다 (HTML로 해석하지 않고 텍스트로만 처리).
function CellText({ text }: { text: string }) {
  const lines = text.split(/<br\s*\/?>/i)
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  )
}

function ContentTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null
  const [head, ...body] = rows
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm min-w-[50%]">
        <thead>
          <tr>
            {head.map((c, i) => (
              <th key={i} className="border border-gray-300 bg-crimson-50 px-3 py-1.5 text-left font-semibold text-gray-800 whitespace-nowrap">
                <CellText text={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri} className="even:bg-gray-50">
              {r.map((c, ci) => (
                <td key={ci} className="border border-gray-300 px-3 py-1.5 align-top">
                  <CellText text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ArticleContent({ content, className = '' }: { content: string; className?: string }) {
  const blocks = toBlocks(content)

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'img') return <img key={i} src={b.value} alt="" className="max-w-full rounded-lg border border-gray-100" />
        if (b.type === 'table') return <ContentTable key={i} rows={b.rows} />
        return b.value.trim() && <p key={i} className="whitespace-pre-wrap">{b.value.trim()}</p>
      })}
    </div>
  )
}
