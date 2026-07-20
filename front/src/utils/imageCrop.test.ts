import {describe, expect, it} from 'vitest'
import {computeCenteredCropRect, SOCIAL_CROP_PRESETS} from './imageCrop'

describe('computeCenteredCropRect', () => {
    it('가로가 긴 원본에서 1:1 크롭 → 높이 기준으로 가운데 정렬된 정사각형', () => {
        const rect = computeCenteredCropRect({width: 1000, height: 500}, {width: 1, height: 1})

        expect(rect).toEqual({x: 250, y: 0, width: 500, height: 500})
    })

    it('세로가 긴 원본에서 16:9 크롭 → 너비 기준으로 가운데 정렬', () => {
        const rect = computeCenteredCropRect({width: 800, height: 1600}, {width: 16, height: 9})

        expect(rect).toEqual({x: 0, y: 575, width: 800, height: 450})
    })

    it('원본과 목표 종횡비가 같으면 원본 전체를 반환', () => {
        const rect = computeCenteredCropRect({width: 1200, height: 800}, {width: 3, height: 2})

        expect(rect).toEqual({x: 0, y: 0, width: 1200, height: 800})
    })
})

describe('SOCIAL_CROP_PRESETS', () => {
    it('모든 프리셋이 고유 id와 양수 종횡비를 가진다', () => {
        expect(SOCIAL_CROP_PRESETS.length).toBeGreaterThan(0)

        const ids = SOCIAL_CROP_PRESETS.map(p => p.id)
        expect(new Set(ids).size).toBe(ids.length)

        for (const preset of SOCIAL_CROP_PRESETS) {
            expect(preset.aspect.width).toBeGreaterThan(0)
            expect(preset.aspect.height).toBeGreaterThan(0)
        }
    })
})
