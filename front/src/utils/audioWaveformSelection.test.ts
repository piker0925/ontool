import {describe, expect, it} from 'vitest'
import {pixelToSeconds, secondsToPixel} from './audioWaveformSelection'

describe('pixelToSeconds', () => {
    it('캔버스 좌측 끝(0px)은 0초, 우측 끝(canvasWidth)은 전체 길이가 된다', () => {
        expect(pixelToSeconds(0, 300, 10)).toBe(0)
        expect(pixelToSeconds(300, 300, 10)).toBe(10)
    })

    it('중간 지점(px)은 비례한 시각으로 변환된다', () => {
        expect(pixelToSeconds(150, 300, 10)).toBeCloseTo(5, 5)
    })

    it('캔버스 밖(음수·초과)으로 드래그해도 0~전체 길이 범위로 클램프된다', () => {
        expect(pixelToSeconds(-50, 300, 10)).toBe(0)
        expect(pixelToSeconds(400, 300, 10)).toBe(10)
    })

    it('캔버스 너비가 0이어도 나누기 0 없이 0을 반환한다', () => {
        expect(pixelToSeconds(50, 0, 10)).toBe(0)
    })
})

describe('secondsToPixel', () => {
    it('pixelToSeconds의 역변환이다(왕복 시 원래 값으로 돌아온다)', () => {
        const canvasWidth = 300
        const durationSeconds = 10
        const originalSeconds = 4.5

        const px = secondsToPixel(originalSeconds, canvasWidth, durationSeconds)
        const roundTripped = pixelToSeconds(px, canvasWidth, durationSeconds)

        expect(roundTripped).toBeCloseTo(originalSeconds, 5)
    })

    it('범위를 벗어난 초(음수·전체 길이 초과)도 캔버스 범위 안으로 클램프된다', () => {
        expect(secondsToPixel(-1, 300, 10)).toBe(0)
        expect(secondsToPixel(20, 300, 10)).toBe(300)
    })

    it('전체 길이가 0이어도 나누기 0 없이 0을 반환한다', () => {
        expect(secondsToPixel(1, 300, 0)).toBe(0)
    })
})
