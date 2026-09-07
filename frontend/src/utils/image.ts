// 업로드한 이미지를 정사각형으로 크롭 + 리사이즈한 뒤 JPEG data URL로 변환합니다.
// 별도 파일 스토리지 없이 DB(TEXT 컬럼)에 그대로 저장할 것이므로 용량을 최대한 줄입니다.
export function fileToResizedDataUrl(
  file: File,
  maxDimension = 400,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'))
      img.onload = () => {
        // 중앙 기준 정사각형으로 크롭
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        const size = Math.min(maxDimension, side)

        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('이미지 처리에 실패했습니다.'))
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)

        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
