// 게시글 본문을 렌더링합니다. 글 작성 시 "사진 삽입" 버튼으로 커서 위치에 끼워넣은
// [[img:data:...]] 마커를 실제 <img> 태그로 변환해, 사진이 문단 중간에 삽입된 것처럼 보여줍니다.
const IMG_MARKER = /\[\[img:(data:[^\]]+)\]\]/g

export default function ArticleContent({ content, className = '' }: { content: string; className?: string }) {
  const parts = content.split(IMG_MARKER)

  return (
    <div className={`space-y-3 ${className}`}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <img key={i} src={part} alt="" className="max-w-full rounded-lg border border-gray-100" />
        ) : (
          part.trim() && (
            <p key={i} className="whitespace-pre-wrap">{part.trim()}</p>
          )
        )
      )}
    </div>
  )
}
