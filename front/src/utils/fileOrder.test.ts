import {describe, expect, it} from 'vitest'
import {moveItem} from './fileOrder'

describe('moveItem', () => {
    it('아래 방향으로 이동하면 다음 항목과 자리를 바꾼다', () => {
        expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    })
    it('위 방향으로 이동하면 이전 항목과 자리를 바꾼다', () => {
        expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    })
    it('맨 위 항목을 위로 이동하면 변화 없다', () => {
        expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    })
    it('맨 아래 항목을 아래로 이동하면 변화 없다', () => {
        expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
    })
    it('원본 배열은 변경하지 않는다', () => {
        const original = ['a', 'b', 'c']
        moveItem(original, 0, 1)
        expect(original).toEqual(['a', 'b', 'c'])
    })
})
