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

// iframe에 넣을 수 있는 embed URL로 변환합니다. youtu.be 단축 링크나 watch?v= 링크는
// 그대로 iframe에 넣으면 유튜브가 "refused to connect"로 막으므로 반드시 이 함수를 거쳐야 합니다.
// YouTube 링크가 아니면(예: Vimeo) 원본 URL을 그대로 반환합니다.
export function getYouTubeEmbedUrl(url: string): string {
  const id = getYouTubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}` : url
}

// Google Drive 공유 링크에서 파일 ID를 추출합니다. 지원 형식:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?id=FILE_ID&export=download
// (파일이 "링크가 있는 모든 사용자"로 공유되어 있어야 재생/썸네일이 정상 동작합니다.)
export function getGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/?#]+)/,
    /drive\.google\.com\/open\?[^#]*\bid=([^&#]+)/,
    /drive\.google\.com\/uc\?[^#]*\bid=([^&#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function getGoogleDriveThumbnail(url: string): string | null {
  const id = getGoogleDriveFileId(url)
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w500` : null
}

// Google Drive는 자체 미리보기 플레이어를 iframe으로 그대로 내장할 수 있게 해줍니다.
export function getGoogleDriveEmbedUrl(url: string): string | null {
  const id = getGoogleDriveFileId(url)
  return id ? `https://drive.google.com/file/d/${id}/preview` : null
}

// YouTube 링크면 YouTube embed로, Google Drive 공유 링크면 Drive 미리보기 embed로 바꿔줍니다.
// 관리자가 영상을 등록할 때 어느 사이트 링크인지 신경 쓸 필요 없이 하나의 입력창에 붙여넣으면
// 되도록, 등록/재생 양쪽에서 이 함수 하나로 판단합니다. 둘 다 아니면 원본 URL을 그대로 둡니다.
export function getVideoEmbedUrl(url: string): string {
  return getYouTubeVideoId(url) ? getYouTubeEmbedUrl(url) : getGoogleDriveEmbedUrl(url) ?? url
}

// 썸네일도 마찬가지로 YouTube/Drive 중 인식되는 쪽에서 자동으로 만들어 줍니다.
export function getVideoThumbnail(url: string): string | null {
  return getYouTubeThumbnail(url) ?? getGoogleDriveThumbnail(url)
}
