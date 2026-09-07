// 업로드한 이미지를 자르지 않고(크롭 없음) 원본 비율을 유지한 채로 최대 크기 안에 들어오도록
// 축소해서 JPEG data URL로 변환합니다. 별도 파일 스토리지 없이 DB(TEXT 컬럼)에 그대로 저장할
// 것이므로 용량은 줄이지만, 얼굴이 잘리지 않도록 크롭은 하지 않습니다.
export function fileToResizedDataUrl(
  file: File,
  maxWidth = 300,
  maxHeight = 500,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'))
      img.onload = () => {
        // 원본보다 키우지 않고, 가로/세로 중 더 많이 줄여야 하는 쪽에 맞춰 비율대로 축소
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('이미지 처리에 실패했습니다.'))
        ctx.drawImage(img, 0, 0, width, height)

        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
