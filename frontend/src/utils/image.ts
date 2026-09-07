// 업로드한 이미지를 지정한 가로x세로 비율로 중앙 크롭한 뒤 정확히 그 크기로 리사이즈하여
// JPEG data URL로 변환합니다. 별도 파일 스토리지 없이 DB(TEXT 컬럼)에 그대로 저장할 것이므로
// 용량을 최대한 줄입니다. 기본값(200x400)은 임원 사진 카드 표시 크기에 맞춘 세로형 비율입니다.
export function fileToResizedDataUrl(
  file: File,
  targetWidth = 200,
  targetHeight = 400,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'))
      img.onload = () => {
        const targetRatio = targetWidth / targetHeight
        const srcRatio = img.width / img.height

        let sx = 0
        let sy = 0
        let sw = img.width
        let sh = img.height

        if (srcRatio > targetRatio) {
          // 원본이 목표 비율보다 가로로 넓음 → 좌우를 잘라 중앙만 사용
          sw = img.height * targetRatio
          sx = (img.width - sw) / 2
        } else {
          // 원본이 목표 비율보다 세로로 김 → 위아래를 잘라내되, 얼굴이 보통 위쪽에 있으므로
          // 상단 쪽을 더 살리는 방향으로 크롭
          sh = img.width / targetRatio
          sy = Math.min(img.height - sh, (img.height - sh) * 0.35)
        }

        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('이미지 처리에 실패했습니다.'))
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)

        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
