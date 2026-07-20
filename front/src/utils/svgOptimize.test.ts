import {describe, expect, it} from 'vitest'
import {optimizeSvg, SvgParseError} from './svgOptimize'

const VERBOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- 이건 필요 없는 주석입니다 -->
  <metadata>Created with Some Tool v1.0</metadata>
  <path d="M0.123456789,0.987654321 L10.111111111,20.222222222"/>
</svg>`

describe('optimizeSvg', () => {
    it('주석과 metadata를 제거하고 원본보다 바이트 수가 줄어든다', () => {
        const result = optimizeSvg(VERBOSE_SVG, {precision: 2, removeMetadata: true, keepViewBox: true})
        expect(result.output).not.toContain('<!--')
        expect(result.output).not.toContain('<metadata')
        expect(result.optimizedBytes).toBeLessThan(result.originalBytes)
    })

    it('path 좌표는 지정한 정밀도로 반올림될 뿐 손상되지 않고, viewBox는 유지되며, 결과가 다시 파싱 가능한 유효 SVG다', () => {
        const result = optimizeSvg(VERBOSE_SVG, {precision: 2, removeMetadata: true, keepViewBox: true})

        // 독립적으로 재파싱해서 구조가 손상되지 않았는지 확인 (DOM 렌더 가능 여부)
        const reparsed = new DOMParser().parseFromString(result.output, 'image/svg+xml')
        expect(reparsed.querySelector('parsererror')).toBeNull()

        const path = reparsed.querySelector('path')!
        const originalNumbers = ['0.123456789', '0.987654321', '10.111111111', '20.222222222'].map(Number)
        const expectedRounded = originalNumbers.map(n => Number(n.toFixed(2)))
        const actualNumbers = (path.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?/g)!.map(Number)
        expect(actualNumbers).toEqual(expectedRounded)

        expect(reparsed.documentElement.getAttribute('viewBox')).toBe('0 0 100 100')
    })

    it('viewBox 유지 옵션을 끄면 viewBox 속성이 제거된다', () => {
        const result = optimizeSvg(VERBOSE_SVG, {precision: 2, removeMetadata: true, keepViewBox: false})
        const reparsed = new DOMParser().parseFromString(result.output, 'image/svg+xml')
        expect(reparsed.documentElement.hasAttribute('viewBox')).toBe(false)
    })

    it('파싱할 수 없는 SVG를 입력하면 크래시 대신 명확한 에러를 던진다', () => {
        expect(() => optimizeSvg('<svg><path d="M0,0 L', {precision: 2, removeMetadata: true, keepViewBox: true}))
            .toThrow(SvgParseError)
    })

    it('svg 루트 요소가 없는 입력(예: 평범한 텍스트)도 명확한 에러를 던진다', () => {
        expect(() => optimizeSvg('이것은 SVG가 아닙니다', {precision: 2, removeMetadata: true, keepViewBox: true}))
            .toThrow(SvgParseError)
    })
})
