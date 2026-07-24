import {describe, expect, it} from 'vitest'
import {readdirSync, readFileSync, statSync} from 'fs'
import {join} from 'path'

// 회귀 가드: `transition-all`(Tailwind)이나 `transition: all`(CSS)은 요소의 모든 속성 변화를
// 브라우저가 감시하게 만들어 비용이 크다. 실제로 전환되는 속성만 명시적으로 나열해야 한다
// (이슈 135). 이 테스트는 src/ 전체를 스캔해 새로 추가되는 사용처를 잡아낸다.
const SRC_ROOT = join(__dirname, '..')
const SCAN_EXTENSIONS = ['.vue', '.ts', '.tsx']

function collectFiles(dir: string): string[] {
    const entries = readdirSync(dir)
    const files: string[] = []
    for (const entry of entries) {
        const fullPath = join(dir, entry)
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
            files.push(...collectFiles(fullPath))
        } else if (SCAN_EXTENSIONS.some((ext) => entry.endsWith(ext)) && !entry.endsWith('.test.ts')) {
            files.push(fullPath)
        }
    }
    return files
}

describe('transition-all 금지 (회귀 가드)', () => {
    it('src/ 어디에도 transition-all 클래스나 transition: all CSS가 없다', () => {
        const offenders: string[] = []
        for (const file of collectFiles(SRC_ROOT)) {
            const content = readFileSync(file, 'utf-8')
            if (/\btransition-all\b/.test(content) || /transition:\s*all\b/.test(content)) {
                offenders.push(file.replace(SRC_ROOT, 'src'))
            }
        }
        expect(offenders).toEqual([])
    })
})
