import {describe, expect, it} from 'vitest'
import {buttonVariants} from './index'

// 이슈 135: 공용 버튼 프리미티브의 transition-all을 실제로 변하는 속성만 명시하도록 교체.
// 버튼이 실제로 상태 변화에 따라 바꾸는 속성:
//  - background-color: variant별 hover 배경
//  - border-color: focus-visible:border-ring, aria-invalid:border-destructive 등
//  - box-shadow: focus-visible:ring-*, aria-invalid:ring-* (ring은 box-shadow로 렌더링됨)
//  - color: outline/ghost/secondary variant의 hover:text-*, aria-expanded:text-*
//  - opacity: disabled:opacity-50
//  - translate: active:translate-y-px (눌림 효과) — Tailwind v4에서 translate-*는 transform이 아닌
//    네이티브 CSS `translate` 속성으로 컴파일된다
const EXPECTED_TRANSITION_PROPERTIES = ['background-color', 'border-color', 'box-shadow', 'color', 'opacity', 'translate']

function extractTransitionProperties(classes: string): string[] {
    const match = classes.match(/transition-\[([^\]]+)]/)
    if (!match) return []
    return match[1].split(',').map((p) => p.trim())
}

describe('buttonVariants — transition-all 제거', () => {
    it('transition-all을 사용하지 않는다', () => {
        const classes = buttonVariants()
        expect(classes).not.toMatch(/\btransition-all\b/)
    })

    it('실제로 변하는 속성만 정확히 명시한다', () => {
        const classes = buttonVariants()
        const properties = extractTransitionProperties(classes)
        expect(properties.sort()).toEqual([...EXPECTED_TRANSITION_PROPERTIES].sort())
    })

    it('variant를 바꿔도 동일한 transition 속성 리스트가 유지된다 (기본 클래스라 variant 무관)', () => {
        const outlineClasses = buttonVariants({variant: 'outline'})
        const destructiveClasses = buttonVariants({variant: 'destructive'})
        expect(extractTransitionProperties(outlineClasses).sort()).toEqual([...EXPECTED_TRANSITION_PROPERTIES].sort())
        expect(extractTransitionProperties(destructiveClasses).sort()).toEqual([...EXPECTED_TRANSITION_PROPERTIES].sort())
    })
})

describe('buttonVariants — 터치 인터랙션', () => {
    it('기본 버튼 클래스에 touch-manipulation이 포함된다 (더블탭 줌 지연 방지)', () => {
        expect(buttonVariants()).toContain('touch-manipulation')
    })

    it('variant/size 조합이 바뀌어도 touch-manipulation이 유지된다', () => {
        expect(buttonVariants({variant: 'ghost', size: 'icon-sm'})).toContain('touch-manipulation')
        expect(buttonVariants({variant: 'destructive', size: 'lg'})).toContain('touch-manipulation')
    })
})
