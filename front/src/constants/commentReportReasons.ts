// 댓글 신고 사유(099) — 백엔드 CommentReportReason enum과 값이 일치해야 한다.
// CommentSection.vue(신고 폼)와 AdminPage.vue(사유 필터)가 이 목록을 공유한다.
export const COMMENT_REPORT_REASONS = [
  {value: 'SPAM', label: '스팸/광고'},
  {value: 'ABUSE', label: '욕설/비방'},
  {value: 'PRIVACY', label: '개인정보 노출'},
  {value: 'OTHER', label: '기타'},
] as const

export type CommentReportReasonValue = typeof COMMENT_REPORT_REASONS[number]['value']
