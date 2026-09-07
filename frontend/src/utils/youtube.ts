// YouTube 링크(watch/youtu.be/embed/shorts 등 다양한 형식)에서 영상 ID를 추출하고,
// 별도 썸네일 URL을 입력하지 않아도 YouTube가 제공하는 썸네일을 자동으로 사용할 수 있게 합니다.
export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/watch\?v=([^?&/]+)/,
    /youtube\.com\/embed\/([^?&/]+)/,
    /youtube\.com\/shorts\/([^?&/]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}
