import {describe, expect, it} from 'vitest'
import {jsonToTs} from './jsonToTs'

describe('jsonToTs', () => {
    it('단순 평면 객체는 원시 타입 필드를 가진 interface로 변환된다', () => {
        const result = jsonToTs({name: '홍길동', age: 30, active: true})
        expect(result).toBe(
            'interface Root {\n  name: string\n  age: number\n  active: boolean\n}',
        )
    })

    it('중첩 객체는 별도 interface로 분리되고 필드는 그 interface 이름을 참조한다', () => {
        const result = jsonToTs({name: '홍길동', address: {city: '서울', zip: '12345'}})
        expect(result).toBe(
            'interface Root {\n  name: string\n  address: Address\n}\n\n' +
            'interface Address {\n  city: string\n  zip: string\n}',
        )
    })

    it('nullable 필드(null 포함 배열)와 순수 배열 필드가 섞이면 각각 정확한 타입으로 반영된다', () => {
        const result = jsonToTs({
            id: 1,
            tags: ['vue', null, 'react'],
            scores: [90, 85],
        })
        expect(result).toBe(
            'interface Root {\n  id: number\n  tags: (string | null)[]\n  scores: number[]\n}',
        )
    })

    it('최상위 필드 값이 그냥 null이면 null 타입으로 반영되고 다른 필드는 원시 타입 그대로 유지된다', () => {
        const result = jsonToTs({name: '홍길동', nickname: null})
        expect(result).toBe(
            'interface Root {\n  name: string\n  nickname: null\n}',
        )
    })

    it('객체 배열 필드는 요소용 interface가 별도로 생성되고 필드 타입은 그 interface 배열로 반영된다', () => {
        const result = jsonToTs({users: [{name: 'a'}, {name: 'b'}]})
        expect(result).toBe(
            'interface Root {\n  users: UsersItem[]\n}\n\n' +
            'interface UsersItem {\n  name: string\n}',
        )
    })
})
