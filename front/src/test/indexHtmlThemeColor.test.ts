import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// front/index.html은 Vue 컴포넌트 트리 밖의 정적 파일이라 여기서 직접 읽어 검증한다.
// 기대 hex 값은 front/src/style.css의 :root/.dark --background 토큰(oklch)을
// 이 테스트와 무관하게 독립적으로 변환한 결과다 (구현이 스스로를 검증하지 않도록).
// vitest는 front/ 를 루트로 실행되므로 process.cwd() 기준 상대 경로를 사용한다.
const indexHtmlPath = resolve(process.cwd(), 'index.html')

// 속성 순서에 의존하지 않도록 name="theme-color" 태그 전체를 먼저 뽑아낸 뒤,
// 그 안에서 media/content 값을 개별적으로 찾는다.
function findThemeColorContent(html: string, scheme: 'light' | 'dark'): string | null {
    const metaTags = html.match(/<meta\b[^>]*name="theme-color"[^>]*\/?>/g) ?? []
    const tag = metaTags.find((t) => t.includes(`(prefers-color-scheme: ${scheme})`))
    if (!tag) return null
    const contentMatch = tag.match(/content="([^"]+)"/)
    return contentMatch ? contentMatch[1] : null
}

describe('front/index.html theme-color meta', () => {
    const html = readFileSync(indexHtmlPath, 'utf-8')

    it('라이트 모드 theme-color가 --background 라이트 토큰과 일치한다', () => {
        const content = findThemeColorContent(html, 'light')
        expect(content, 'light theme-color meta 태그를 찾지 못함').not.toBeNull()
        expect(content!.toUpperCase()).toBe('#F7F6F3')
    })

    it('다크 모드 theme-color가 --background 다크 토큰과 일치한다', () => {
        const content = findThemeColorContent(html, 'dark')
        expect(content, 'dark theme-color meta 태그를 찾지 못함').not.toBeNull()
        expect(content!.toUpperCase()).toBe('#060606')
    })
})
