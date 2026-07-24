import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

// 주의: `new URL('./style.css', import.meta.url)` 패턴은 Vite가 CSS 에셋 임포트로 정적 분석해
// import.meta.url을 파일 스킴이 아닌 값으로 치환해버린다 — 그래서 경로를 두 단계로 나눠 계산한다.
const testFileDir = dirname(fileURLToPath(import.meta.url))
const cssPath = resolve(testFileDir, 'style.css')
const css = readFileSync(cssPath, 'utf-8')

describe('style.css — 전역 탭 하이라이트', () => {
    it('-webkit-tap-highlight-color를 지정해 브라우저 기본 회색 하이라이트를 덮어쓴다', () => {
        expect(css).toMatch(/-webkit-tap-highlight-color\s*:\s*[^;]+;/i)
    })

    it('값이 비어있거나 initial/inherit처럼 아무 효과 없는 값이 아니다', () => {
        const match = css.match(/-webkit-tap-highlight-color\s*:\s*([^;]+);/i)
        expect(match).not.toBeNull()
        const value = match![1].trim().toLowerCase()
        expect(value).not.toBe('')
        expect(['initial', 'inherit', 'unset']).not.toContain(value)
    })
})
