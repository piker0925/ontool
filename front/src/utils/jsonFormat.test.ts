import {describe, expect, it} from 'vitest'
import {formatJson, minifyJson} from './jsonFormat'

describe('formatJson', () => {
    it('들여쓰기 적용된 JSON 반환', () => {
        expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
    })
    it('이미 포맷된 JSON도 정규화', () => {
        expect(formatJson('{ "a" :  1 }')).toBe('{\n  "a": 1\n}')
    })
    it('유효하지 않은 JSON은 에러', () => {
        expect(() => formatJson('not json')).toThrow()
    })
})

describe('minifyJson', () => {
    it('공백 제거된 JSON 반환', () => {
        expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}')
    })
    it('유효하지 않은 JSON은 에러', () => {
        expect(() => minifyJson('bad')).toThrow()
    })
})
