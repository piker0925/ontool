import {describe, expect, it} from 'vitest'
import {calcBiorhythm} from './biorhythmCalc'

describe('calcBiorhythm', () => {
    it('출생 당일(0일차)은 세 지표 모두 0에서 시작', () => {
        expect(calcBiorhythm(0)).toEqual({physical: 0, emotional: 0, intellectual: 0})
    })

    it('신체 주기(23일)가 정확히 한 바퀴 돈 23일차는 다시 0으로 돌아옴', () => {
        expect(calcBiorhythm(23).physical).toBeCloseTo(0, 6)
    })

    it('감성 주기(28일)의 1/4 지점인 7일차는 정확히 최고점 100', () => {
        expect(calcBiorhythm(7).emotional).toBeCloseTo(100, 6)
    })

    it('지성 주기(33일) 8일차는 사인 공식으로 계산한 값(약 99.8867)과 일치', () => {
        expect(calcBiorhythm(8).intellectual).toBeCloseTo(99.8867, 3)
    })

    it('세 주기 길이가 다르므로 같은 날짜라도 세 지표 값이 서로 다름', () => {
        const {physical, emotional, intellectual} = calcBiorhythm(10)
        expect(physical).not.toBeCloseTo(emotional, 2)
        expect(emotional).not.toBeCloseTo(intellectual, 2)
    })
})
