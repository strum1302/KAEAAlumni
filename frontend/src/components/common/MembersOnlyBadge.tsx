// "회원 전용" 표시. 공지사항/자유게시판 글 중 회원 전용으로 지정된 글의 제목 앞에 붙습니다.
export default function MembersOnlyBadge() {
  return (
    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 shrink-0"
      title="로그인한 회원만 내용을 볼 수 있는 글입니다">
      🔒 회원 전용
    </span>
  )
}
