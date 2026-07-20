import {describe, expect, it} from 'vitest'
import {diffJson} from './jsonDiff'

describe('diffJson', () => {
    it('키 추가·삭제·값 변경을 각각 구분해서 반환한다', () => {
        const a = {name: '홍길동', age: 30, city: '서울'}
        const b = {name: '홍길동', age: 31, country: '한국'}

        const entries = diffJson(a, b)

        expect(entries).toContainEqual({path: '$.age', kind: 'changed', oldValue: 30, newValue: 31})
        expect(entries).toContainEqual({path: '$.city', kind: 'removed', oldValue: '서울'})
        expect(entries).toContainEqual({path: '$.country', kind: 'added', newValue: '한국'})
        expect(entries).toHaveLength(3)
    })

    it('중첩 객체·배열도 경로를 따라 재귀적으로 비교한다', () => {
        const a = {store: {book: [{author: 'Kim'}, {author: 'Lee'}]}}
        const b = {store: {book: [{author: 'Kim'}, {author: 'Park'}]}}

        const entries = diffJson(a, b)

        expect(entries).toEqual([
            {path: '$.store.book[1].author', kind: 'changed', oldValue: 'Lee', newValue: 'Park'},
        ])
    })

    it('동일한 값이 다른 키로 이동한 경우 삭제+추가로 구분하고 변경 없음으로 착각하지 않는다', () => {
        // 텍스트 라인 diff라면 "1"이라는 값이 양쪽에 다 있어 매칭될 수 있지만,
        // 구조 비교는 키 경로 기준이므로 a는 삭제, b는 추가로 각각 잡아야 한다.
        const a = {a: 1, x: 5}
        const b = {b: 1, x: 6}

        const entries = diffJson(a, b)

        expect(entries).toContainEqual({path: '$.a', kind: 'removed', oldValue: 1})
        expect(entries).toContainEqual({path: '$.b', kind: 'added', newValue: 1})
        expect(entries).toContainEqual({path: '$.x', kind: 'changed', oldValue: 5, newValue: 6})
        expect(entries).toHaveLength(3)
    })

    it('완전히 동일한 값이면 빈 배열을 반환한다', () => {
        expect(diffJson({a: [1, 2, {b: '홍'}]}, {a: [1, 2, {b: '홍'}]})).toEqual([])
    })

    it('배열 길이가 다르면 초과분을 added/removed로 표시한다', () => {
        const entries = diffJson([1, 2], [1, 2, 3])
        expect(entries).toEqual([{path: '$[2]', kind: 'added', newValue: 3}])
    })
})
