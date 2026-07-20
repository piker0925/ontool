import {describe, expect, it} from 'vitest'
import {type LineToolOptions, processTextLines} from './textLines'

const base: LineToolOptions = {sort: 'none', dedupe: false, separator: '', separatorMode: 'join'}

describe('processTextLines — 중복 제거', () => {
    it('중복이 섞인 목록에서 중복 제거 후 줄 수가 정확히 줄고, 남는 줄도 정확하다', () => {
        const result = processTextLines('b\na\nb\nc\na', {...base, dedupe: true})
        // Set은 첫 등장 순서를 보존한다 — 정확한 배열까지 확인 (개수만 확인하는 패턴 A 방지)
        expect(result.split('\n')).toEqual(['b', 'a', 'c'])
    })

    it('중복이 없으면 그대로 유지된다 (과도하게 지우지 않음을 확인)', () => {
        const result = processTextLines('x\ny\nz', {...base, dedupe: true})
        expect(result.split('\n')).toEqual(['x', 'y', 'z'])
    })
})

describe('processTextLines — 정렬', () => {
    it('가나다순 정렬: 순서가 사전식으로 정확히 맞다', () => {
        const result = processTextLines('바나나\n사과\n가지', {...base, sort: 'alpha'})
        expect(result.split('\n')).toEqual(['가지', '바나나', '사과'])
    })

    it('숫자순 정렬은 사전식 정렬과 다른 결과를 낸다 (10 vs 2)', () => {
        const numeric = processTextLines('10\n2\n1', {...base, sort: 'numeric'})
        const alpha = processTextLines('10\n2\n1', {...base, sort: 'alpha'})
        expect(numeric.split('\n')).toEqual(['1', '2', '10'])
        expect(alpha.split('\n')).toEqual(['1', '10', '2'])
        expect(numeric).not.toBe(alpha)
    })

    it('정렬 없음(none)은 원래 순서를 보존한다', () => {
        const result = processTextLines('c\na\nb', base)
        expect(result.split('\n')).toEqual(['c', 'a', 'b'])
    })
})

describe('processTextLines — 정렬 + 중복 제거 조합', () => {
    it('중복 제거 후 정렬까지 함께 적용된다', () => {
        const result = processTextLines('c\na\nc\nb\na', {...base, dedupe: true, sort: 'alpha'})
        expect(result.split('\n')).toEqual(['a', 'b', 'c'])
    })
})

describe('processTextLines — 구분자 join/split', () => {
    it('join 모드: 줄바꿈으로 나뉜 입력을 지정한 구분자로 합쳐 출력한다', () => {
        const result = processTextLines('a\nb\nc', {...base, separatorMode: 'join', separator: ', '})
        expect(result).toBe('a, b, c')
    })

    it('split 모드: 지정한 구분자로 입력을 나누고 줄바꿈으로 출력한다', () => {
        const result = processTextLines('a, b, c', {...base, separatorMode: 'split', separator: ', '})
        expect(result).toBe('a\nb\nc')
    })

    it('split 모드 + 정렬/중복제거를 함께 적용할 수 있다', () => {
        const result = processTextLines('b,a,b,c', {...base, separatorMode: 'split', separator: ',', dedupe: true, sort: 'alpha'})
        expect(result).toBe('a\nb\nc')
    })

    it('구분자가 빈 문자열이면 줄바꿈을 기본값으로 사용한다', () => {
        const result = processTextLines('a\nb', {...base, separatorMode: 'join', separator: ''})
        expect(result).toBe('a\nb')
    })
})
