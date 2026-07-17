export const BRAND = {
    siteName: 'OnTool',
    wordmark: 'ontool',
    koreanName: '온툴',
    slogan: '모든 도구, 한 곳에',
} as const

// DESIGN.md §0: "on"은 primary, "tool"은 foreground — 두 톤으로 나눠 렌더링하는 소비처가 여럿이라 여기서 한 번만 계산
export const WORDMARK_PREFIX = BRAND.wordmark.slice(0, 2)
export const WORDMARK_REST = BRAND.wordmark.slice(2)
