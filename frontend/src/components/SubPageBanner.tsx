// 서브 페이지(소개/행사/갤러리/게시판/회비안내) 상단에 들어가는 얇은 타이틀 배너.
// 홈 화면의 큰 히어로 배너와 달리, 본문을 빨리 읽는 게 목적인 서브 페이지에서는
// 사진 위에 크림슨 톤을 짙게 깔고 페이지 제목만 짧게 보여주는 미니 배너로 통일합니다.
// - min-height만 두고(고정 height 아님) 내용은 flex-1로 두어, 부제목이 좁은 화면에서
//   두 줄로 꺾여도 잘리지 않고 배너가 필요한 만큼만 자연스럽게 늘어납니다.

export interface SubPageBannerProps {
  image: string
  // 사진에서 잘리지 않고 보여줄 위치. 기본은 가운데.
  position?: 'top' | 'center' | 'bottom'
  title: string
  subtitle?: string
}

function objectPositionClass(position?: SubPageBannerProps['position']) {
  if (position === 'top') return 'object-top'
  if (position === 'bottom') return 'object-bottom'
  return 'object-center'
}

export default function SubPageBanner({ image, position, title, subtitle }: SubPageBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-6 flex flex-col min-h-[6rem] md:min-h-[11rem]">
      <img
        src={image}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover ${objectPositionClass(position)}`}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-crimson-900/85 to-crimson-700/70" />
      <div className="relative flex-1 flex flex-col items-center justify-center text-center text-white px-4 py-2.5 md:py-5">
        <h1 className="text-base md:text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-[11px] md:text-sm text-crimson-50/90 mt-0.5 md:mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
