// 어드민 대시보드 차트(118) 공용 포맷터.

/** "yyyy-MM-dd" → "MM/dd". 형식이 안 맞으면 원본을 그대로 돌려준다. */
export function shortDate(iso: string): string {
  const parts = iso.split('-')
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : iso
}
