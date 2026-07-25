// 어드민 대시보드 차트 색상(118) — dataviz 스킬의 검증된 카테고리 팔레트를
// front/src/style.css의 --chart-1..5 토큰으로 그대로 옮겨왔다. CSS 변수라 라이트/다크 전환 시
// 차트를 다시 그리지 않고도 색만 바뀐다.
//
// 순서는 절대 순환·재배열하지 않는다 — 인접 쌍 색맹 대비를 최대화하도록 산출된 고정 순서다.
// 각 도메인(레인, 가입경로, 액션 타입 등)은 항상 같은 고정 순서로 데이터를 구성해서 넘겨야
// "카테고리가 색을 따라가지, 순위를 따라가지 않는다"는 원칙이 지켜진다.
export const CATEGORICAL_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

/** 상태 전용 고정색(성공/실패/주의 등) — 카테고리 팔레트와 별개, 항상 같은 의미로만 쓴다. */
export const STATUS_COLORS = {
  good: 'var(--chart-status-good)',
  warning: 'var(--chart-status-warning)',
  critical: 'var(--chart-status-critical)',
} as const

export function categoricalColor(index: number): string {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
}
