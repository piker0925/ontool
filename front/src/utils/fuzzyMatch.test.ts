import {describe, expect, it} from 'vitest'
import {fuzzyScore} from './fuzzyMatch'

describe('fuzzyScore', () => {
    it('축약 입력이 순서대로만 나오면(연속하지 않아도) 매치되어 양수 점수를 반환한다', () => {
        expect(fuzzyScore('이미지 리사이즈', '이리사')).toBeGreaterThan(0)
    })

    it('검색어 글자가 순서대로 나오지 않으면 매치되지 않아 0을 반환한다', () => {
        expect(fuzzyScore('이미지 리사이즈', '사리')).toBe(0)
    })

    it('검색어의 글자 하나라도 대상에 없으면 0을 반환한다', () => {
        expect(fuzzyScore('이미지 리사이즈', '이미지Q')).toBe(0)
    })

    it('연속으로 매치되는 대상이 흩어져 매치되는 대상보다 점수가 높다', () => {
        const consecutive = fuzzyScore('이미지 리사이즈', '이미지')
        const scattered = fuzzyScore('이 사람이 미리 지운 파일', '이미지')
        expect(consecutive).toBeGreaterThan(scattered)
    })

    it('검색어가 더 이른 위치에서 시작하는 대상이 더 늦게 시작하는 대상보다 점수가 높다', () => {
        const early = fuzzyScore('PDF 병합 도구', 'PDF')
        const late = fuzzyScore('이미지 워터마크 PDF 변환', 'PDF')
        expect(early).toBeGreaterThan(late)
    })

    it('대소문자를 구분하지 않는다', () => {
        expect(fuzzyScore('JSON Formatter', 'json')).toBeGreaterThan(0)
        expect(fuzzyScore('JSON Formatter', 'JSON')).toBe(fuzzyScore('JSON Formatter', 'json'))
    })

    it('완전 일치 검색은 여전히 매치된다 (회귀 방지)', () => {
        expect(fuzzyScore('PDF 병합', 'PDF 병합')).toBeGreaterThan(0)
    })
})
