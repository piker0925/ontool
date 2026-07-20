// 브라우저 로컬 달력 날짜를 YYYY-MM-DD로 반환한다. Date#toISOString()은 UTC로 변환하므로
// KST(UTC+9) 자정~오전 9시 사이에는 하루 전 날짜가 나오는 버그가 생긴다 — 로컬 getter만 쓴다.
export function todayDateString(date: Date = new Date()): string {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}
