import {describe, expect, it} from 'vitest'
import {queryJsonPath} from './jsonPath'

const STORE = {
    store: {
        book: [
            {author: 'Kim', price: 10},
            {author: 'Lee', price: 20},
            {author: 'Park', price: 30},
        ],
        bicycle: {color: 'red'},
    },
}

describe('queryJsonPath', () => {
    it('배열 와일드카드로 중첩된 필드를 모두 추출한다', () => {
        const matches = queryJsonPath(STORE, '$.store.book[*].author')

        expect(matches).toHaveLength(3)
        expect(matches.map(m => m.value)).toEqual(['Kim', 'Lee', 'Park'])
        expect(matches.map(m => m.path)).toEqual([
            '$.store.book[0].author',
            '$.store.book[1].author',
            '$.store.book[2].author',
        ])
    })

    it('숫자 인덱스로 배열의 특정 원소에 접근한다', () => {
        const matches = queryJsonPath(STORE, '$.store.book[1].price')
        expect(matches).toEqual([{path: '$.store.book[1].price', value: 20}])
    })

    it('객체 와일드카드는 모든 자식 값을 순회한다', () => {
        const matches = queryJsonPath(STORE, '$.store.bicycle.*')
        expect(matches).toEqual([{path: '$.store.bicycle.color', value: 'red'}])
    })

    it('매칭되는 경로가 없으면 빈 배열을 반환한다', () => {
        expect(queryJsonPath(STORE, '$.store.book[9].author')).toEqual([])
        expect(queryJsonPath(STORE, '$.store.missing')).toEqual([])
    })

    it('$로 시작하지 않으면 에러를 던진다', () => {
        expect(() => queryJsonPath(STORE, 'store.book')).toThrow()
    })

    it('닫는 대괄호가 없으면 에러를 던진다', () => {
        expect(() => queryJsonPath(STORE, '$.store.book[0')).toThrow()
    })

    it('대괄호 안 표현식을 해석할 수 없으면 에러를 던진다', () => {
        expect(() => queryJsonPath(STORE, '$.store.book[?(@.price>10)]')).toThrow()
    })
})
