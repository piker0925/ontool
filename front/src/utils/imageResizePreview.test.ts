import {describe, expect, it} from 'vitest'
import {predictResizeOutput} from './imageResizePreview'

// 각 케이스는 ImageResizeModuleTest.java의 동일 시나리오와 숫자를 맞춰,
// 프론트 미리보기가 백엔드 실제 결과와 어긋나지 않는지 교차 검증한다.
describe('predictResizeOutput', () => {
    it('px + 종횡비유지 끔 → 요청한 크기 그대로', () => {
        const result = predictResizeOutput({width: 200, height: 150},
            {unit: 'px', width: 100, height: 75, keepAspectRatio: false, preventUpscale: true})

        expect(result).toEqual({width: 100, height: 75})
    })

    it('px + 종횡비유지 켬 → 박스 안에 비율 유지(작은 배율 채택)', () => {
        // 1000x800(5:4) → 500x500 박스 → 500x400
        const result = predictResizeOutput({width: 1000, height: 800},
            {unit: 'px', width: 500, height: 500, keepAspectRatio: true, preventUpscale: true})

        expect(result).toEqual({width: 500, height: 400})
    })

    it('종횡비유지 끄면 박스 크기로 강제 변형', () => {
        const result = predictResizeOutput({width: 1000, height: 800},
            {unit: 'px', width: 500, height: 500, keepAspectRatio: false, preventUpscale: true})

        expect(result).toEqual({width: 500, height: 500})
    })

    it('% 단위는 원본 기준으로 환산', () => {
        const result = predictResizeOutput({width: 1000, height: 800},
            {unit: '%', width: 50, height: 50, keepAspectRatio: true, preventUpscale: true})

        expect(result).toEqual({width: 500, height: 400})
    })

    it('preventUpscale 기본 동작 → 확대 요청을 원본 크기로 클램프', () => {
        const result = predictResizeOutput({width: 200, height: 150},
            {unit: '%', width: 200, height: 200, keepAspectRatio: true, preventUpscale: true})

        expect(result).toEqual({width: 200, height: 150})
    })

    it('preventUpscale=false면 확대를 그대로 허용', () => {
        const result = predictResizeOutput({width: 200, height: 150},
            {unit: '%', width: 200, height: 200, keepAspectRatio: true, preventUpscale: false})

        expect(result).toEqual({width: 400, height: 300})
    })

    it('preventUpscale은 확대되는 축만 묶고, 축소되는 축은 그대로 둔다', () => {
        // 가로만 200%(확대), 세로는 50%(축소) → 가로만 원본(200)으로 클램프된 뒤 종횡비 유지 적용
        const result = predictResizeOutput({width: 200, height: 150},
            {unit: '%', width: 200, height: 50, keepAspectRatio: true, preventUpscale: true})

        expect(result).toEqual({width: 100, height: 75})
    })

    it('px 모드에서도 확대 방지가 동일하게 적용된다', () => {
        const result = predictResizeOutput({width: 100, height: 80},
            {unit: 'px', width: 500, height: 400, keepAspectRatio: true, preventUpscale: true})

        expect(result).toEqual({width: 100, height: 80})
    })
})
