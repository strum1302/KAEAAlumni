// 관리자가 구글맵 링크(https://maps.app.goo.gl/... 또는 google.com/maps/...)를 직접 입력했으면
// 그대로 사용하고, 주소 텍스트만 입력했으면 구글맵 검색 링크로 자동 변환합니다.
export function getGoogleMapsLink(value: string): string {
  if (/^https?:\/\//i.test(value)) return value
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`
}
