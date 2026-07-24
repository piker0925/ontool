import {describe, expect, it} from 'vitest'
import {buttonVariants} from './index'

describe('buttonVariants — 터치 인터랙션', () => {
    it('기본 버튼 클래스에 touch-manipulation이 포함된다 (더블탭 줌 지연 방지)', () => {
        expect(buttonVariants()).toContain('touch-manipulation')
    })

    it('variant/size 조합이 바뀌어도 touch-manipulation이 유지된다', () => {
        expect(buttonVariants({variant: 'ghost', size: 'icon-sm'})).toContain('touch-manipulation')
        expect(buttonVariants({variant: 'destructive', size: 'lg'})).toContain('touch-manipulation')
    })
})
