import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// 캠퍼스 사진으로 채우는 히어로 배너.
// - 사진이 세로로 긴 비율(예: 640x1138)이라 가로로 넓은 배너 한 칸을 object-cover로
//   채우면 위아래가 심하게 잘리므로, 데스크톱에서는 세로 사진 여러 장을 나란히
//   붙여서(기본 3분할) 보여주고, 모바일(md 미만)에서는 한 장씩 전체 화면으로 보여줍니다.
// - desktopImages를 따로 넘기면, 데스크톱에서는 3분할 대신 그 사진들로 가로 배너
//   한 장(전체 화면 크로스페이드)을 보여줍니다. 학교에서 받은 가로로 넓은 공식
//   사진(분수대, 본관 전경, 정문 등)처럼 세로로 자르면 아쉬운 사진에 사용합니다.
//   desktopImages가 없으면 기존처럼 images를 3분할로 보여줍니다.
// - 각 칸은 독립적으로, 서로 다른 타이밍에 크로스페이드 전환됩니다(동시에 다 같이
//   깜빡이지 않도록 칸마다 시작을 살짝 늦춤).
// - 사진 로딩에 실패하면 그 칸의 로테이션에서만 조용히 제외됩니다.
// - 사진이 하나도 없으면 기존 크림슨 그라데이션으로 자연스럽게 폴백합니다.
// - 브라우저 탭이 백그라운드로 가면 전환을 멈추고, 시스템의 "모션 줄이기" 설정도 따릅니다.
// - 배너 높이는 min-h-[max(px, vh)]로 잡습니다 — 화면 세로 높이에 비례해 줄어들되
//   너무 작아지지는 않는 높이가 "목표치"입니다. 화면 세로 높이가 짧은 노트북에서도
//   배너가 화면 대부분을 차지하지 않아, 바로 아래 "다가오는 주요 행사" 카드 윗부분이
//   스크롤 없이도 살짝 보입니다(Above the Fold).
// - 다만 이건 min-height(하한선)일 뿐, 상한선(max-height)은 두지 않습니다. 텍스트가
//   좁은 화면에서 여러 줄로 꺾이거나 버튼이 다음 줄로 넘어가서 목표 높이보다 더 필요해지면
//   (section을 flex column으로, 텍스트 영역을 flex-1로 두어) 배너가 그만큼 자연스럽게
//   늘어날 뿐, 글자나 버튼이 잘려서 안 보이는 일은 없습니다.

export interface CampusHeroImage {
  src: string
  // 사진에서 잘리지 않고 보여줄 위치. 기본은 가운데.
  position?: 'top' | 'center' | 'bottom'
}

type CampusHeroInput = string | CampusHeroImage

interface CampusHeroProps {
  images: CampusHeroInput[]
  // 지정하면 데스크톱에서 3분할 대신 이 사진들로 가로 배너 한 장을 보여줍니다
  // (모바일은 계속 images를 한 장씩 보여줍니다). 가로로 넓은 사진에 사용하세요.
  desktopImages?: CampusHeroInput[]
  className?: string
  children?: ReactNode
  columns?: number // 데스크톱 분할 수 (기본 3, desktopImages 지정 시 무시)
  intervalMs?: number // 칸별 전환 간격 (기본 4000ms)
}

function normalize(images: CampusHeroInput[]): CampusHeroImage[] {
  return images.map((img) => (typeof img === 'string' ? { src: img } : img))
}

function objectPositionClass(position?: CampusHeroImage['position']) {
  if (position === 'top') return 'object-top'
  if (position === 'bottom') return 'object-bottom'
  return 'object-center'
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  useEffect(() => {
    const handler = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])
  return visible
}

function useIsDesktop(breakpointPx = 768) {
  const query = `(min-width: ${breakpointPx}px)`
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])
  return isDesktop
}

// 한 칸(column)의 독립적인 크로스페이드 슬라이드쇼.
function HeroTile({
  images, intervalMs, delayMs, paused,
}: { images: CampusHeroImage[]; intervalMs: number; delayMs: number; paused: boolean }) {
  const [pool, setPool] = useState(images)
  const [index, setIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState<number | null>(null)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    setPool(images)
    setIndex(0)
    setPrevIndex(null)
  }, [images])

  useEffect(() => {
    if (paused || pool.length <= 1) return
    let timer: ReturnType<typeof setInterval> | undefined
    const delay = setTimeout(() => {
      timer = setInterval(() => {
        setIndex((i) => {
          setPrevIndex(i)
          setFading(false)
          return (i + 1) % pool.length
        })
      }, intervalMs)
    }, delayMs)
    return () => { clearTimeout(delay); if (timer) clearInterval(timer) }
  }, [paused, pool.length, intervalMs, delayMs])

  useEffect(() => {
    if (prevIndex === null) return
    const raf = requestAnimationFrame(() => setFading(true))
    const t = setTimeout(() => setPrevIndex(null), 1400)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [prevIndex])

  // 로딩에 실패한 사진은 이 칸의 로테이션에서만 조용히 제외합니다.
  const dropBroken = (broken: CampusHeroImage) => {
    setPool((p) => {
      const next = p.filter((img) => img.src !== broken.src)
      return next.length ? next : p
    })
    setIndex(0)
    setPrevIndex(null)
  }

  if (!pool.length) return null
  const current = pool[index % pool.length]
  const prev = prevIndex !== null ? pool[prevIndex % pool.length] : null

  return (
    <div className="relative w-full h-full overflow-hidden bg-crimson-900">
      <img
        src={current.src}
        alt=""
        onError={() => dropBroken(current)}
        className={`absolute inset-0 w-full h-full object-cover ${objectPositionClass(current.position)}`}
      />
      {prev && (
        <img
          src={prev.src}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover ${objectPositionClass(prev.position)} transition-opacity duration-[1400ms] ease-in-out ${
            fading ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
    </div>
  )
}

export default function CampusHero({
  images, desktopImages, className = '', children, columns = 3, intervalMs = 4000,
}: CampusHeroProps) {
  const normalized = normalize(images)
  const normalizedDesktop = desktopImages ? normalize(desktopImages) : null
  const reducedMotion = usePrefersReducedMotion()
  const visible = usePageVisible()
  const isDesktop = useIsDesktop()
  const paused = reducedMotion || !visible

  // 사진이 하나도 없으면 기존 크림슨 그라데이션으로 폴백합니다.
  if (!normalized.length && !normalizedDesktop?.length) {
    return (
      <section className={`relative overflow-hidden bg-crimson text-white ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-black/40" />
        <div className="relative flex flex-col items-center justify-center text-center px-6 py-16 md:py-20 space-y-4">
          {children}
        </div>
      </section>
    )
  }

  // 같은 시점에 같은 사진이 두 칸에 뜨지 않도록 칸별로 번갈아 배분합니다.
  const buckets: CampusHeroImage[][] = Array.from({ length: columns }, () => [])
  normalized.forEach((img, i) => buckets[i % columns].push(img))

  return (
    <section className={`relative overflow-hidden text-white flex flex-col min-h-[max(320px,42vh)] md:min-h-[max(380px,46vh)] ${className}`}>
      <div className="absolute inset-0">
        {isDesktop ? (
          normalizedDesktop?.length ? (
            <HeroTile images={normalizedDesktop} intervalMs={intervalMs} delayMs={0} paused={paused} />
          ) : (
            <div className="grid h-full w-full gap-0.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {buckets.map((bucket, col) => (
                <HeroTile key={col} images={bucket} intervalMs={intervalMs} delayMs={(intervalMs / columns) * col} paused={paused} />
              ))}
            </div>
          )
        ) : (
          <HeroTile images={normalized} intervalMs={intervalMs} delayMs={0} paused={paused} />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-black/40" />
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-6 md:py-10 space-y-3">
        {children}
      </div>
    </section>
  )
}
