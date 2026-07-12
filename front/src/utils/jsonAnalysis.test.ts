import {describe, expect, it} from 'vitest'
import {
    computeJsonStats,
    extractLineValue,
    getLine,
    locateJsonSyntaxError,
    positionToLineCol,
    tokenizeJsonLine,
} from './jsonAnalysis'

describe('positionToLineCol', () => {
    it('첫 줄 위치', () => {
        expect(positionToLineCol('abc', 2)).toEqual({line: 1, column: 3})
    })
    it('줄바꿈 이후 위치', () => {
        // "ab\ncd\nef" — position 4 = 'd' (2번째 줄 2번째 열)
        expect(positionToLineCol('ab\ncd\nef', 4)).toEqual({line: 2, column: 2})
        expect(positionToLineCol('ab\ncd\nef', 6)).toEqual({line: 3, column: 1})
    })
    it('범위를 넘으면 끝 위치로 클램프', () => {
        expect(positionToLineCol('ab', 99)).toEqual({line: 1, column: 3})
    })
})

describe('locateJsonSyntaxError', () => {
    it('유효한 JSON은 null', () => {
        expect(locateJsonSyntaxError('{"a": 1}')).toBeNull()
        expect(locateJsonSyntaxError('[1, 2, 3]')).toBeNull()
        expect(locateJsonSyntaxError('"str"')).toBeNull()
        expect(locateJsonSyntaxError('  {"a": [true, null, 1.5e3]}  ')).toBeNull()
    })
    it('멀티라인 trailing comma — 정확한 줄/열 (쉼표 위치)', () => {
        const input = '{\n  "a": 1,\n  "b": 2,\n}'
        const loc = locateJsonSyntaxError(input)!
        // 3번째 줄의 끝 쉼표 (열 9)
        expect(loc.line).toBe(3)
        expect(loc.column).toBe(9)
        expect(loc.message).toContain('쉼표')
    })
    it('콜론 누락 — 해당 줄 지목', () => {
        const input = '{\n  "a": 1,\n  "b" 2\n}'
        const loc = locateJsonSyntaxError(input)!
        expect(loc.line).toBe(3)
        expect(loc.column).toBe(7)
        expect(loc.message).toContain(':')
    })
    it('닫히지 않은 문자열 — 문자열 시작 위치 지목', () => {
        const input = '{"a": "unclosed}'
        const loc = locateJsonSyntaxError(input)!
        expect(loc.line).toBe(1)
        expect(loc.column).toBe(7)
        expect(loc.message).toContain('문자열')
    })
    it('속성 이름이 문자열이 아님', () => {
        const input = '{a: 1}'
        const loc = locateJsonSyntaxError(input)!
        expect(loc.line).toBe(1)
        expect(loc.column).toBe(2)
        expect(loc.message).toContain('속성 이름')
    })
    it('값 뒤 잉여 문자', () => {
        const input = '{"a": 1} x'
        const loc = locateJsonSyntaxError(input)!
        expect(loc.line).toBe(1)
        expect(loc.column).toBe(10)
    })
    it('객체 안 닫힘 (EOF)', () => {
        const input = '{"a": 1'
        const loc = locateJsonSyntaxError(input)!
        expect(loc.message).toContain('닫히지 않았습니다')
    })
    it('잘못된 숫자 형식', () => {
        const input = '[1, 2.]'
        const loc = locateJsonSyntaxError(input)!
        expect(loc.line).toBe(1)
        expect(loc.column).toBe(5)
        expect(loc.message).toContain('숫자')
    })
})

describe('getLine', () => {
    it('해당 줄 텍스트 반환', () => {
        expect(getLine('a\nbb\nccc', 2)).toBe('bb')
    })
    it('범위 밖은 빈 문자열', () => {
        expect(getLine('a', 5)).toBe('')
    })
})

describe('computeJsonStats', () => {
    it('중첩 구조의 정확한 카운트', () => {
        const value = {
            name: '홍길동',           // string
            age: 30,                  // number
            active: true,             // boolean
            meta: null,               // null
            skills: ['Java', 'Vue'],  // array + 2 strings
            address: {city: 'Seoul', geo: {lat: 1.2, lng: 3.4}}, // 중첩 객체
        }
        const s = computeJsonStats(value)
        expect(s.keys).toBe(10)      // name,age,active,meta,skills,address + city,geo + lat,lng
        expect(s.objects).toBe(3)    // root, address, geo
        expect(s.arrays).toBe(1)
        expect(s.strings).toBe(4)    // 홍길동, Java, Vue, Seoul
        expect(s.numbers).toBe(3)    // 30, lat, lng
        expect(s.booleans).toBe(1)
        expect(s.nulls).toBe(1)
        expect(s.maxDepth).toBe(3)   // root(1) > address(2) > geo(3)
    })
    it('스칼라 루트는 depth 0, 빈 객체는 depth 1', () => {
        expect(computeJsonStats(42).maxDepth).toBe(0)
        expect(computeJsonStats({}).maxDepth).toBe(1)
        expect(computeJsonStats([[[]]]).maxDepth).toBe(3)
    })
})

describe('tokenizeJsonLine', () => {
    it('키와 문자열 값 구분', () => {
        expect(tokenizeJsonLine('  "name": "홍길동",')).toEqual([
            {text: '  ', type: 'plain'},
            {text: '"name"', type: 'key'},
            {text: ':', type: 'punct'},
            {text: ' ', type: 'plain'},
            {text: '"홍길동"', type: 'string'},
            {text: ',', type: 'punct'},
        ])
    })
    it('숫자/불리언/null 토큰', () => {
        expect(tokenizeJsonLine('  "n": -1.5e3,')).toContainEqual({text: '-1.5e3', type: 'number'})
        expect(tokenizeJsonLine('  "b": true')).toContainEqual({text: 'true', type: 'boolean'})
        expect(tokenizeJsonLine('  "x": null,')).toContainEqual({text: 'null', type: 'null'})
    })
    it('배열 요소 문자열은 key가 아니라 string', () => {
        const tokens = tokenizeJsonLine('    "Java",')
        expect(tokens).toContainEqual({text: '"Java"', type: 'string'})
        expect(tokens.some(t => t.type === 'key')).toBe(false)
    })
    it('문자열 내부의 콜론/숫자는 토큰으로 쪼개지 않음', () => {
        const tokens = tokenizeJsonLine('  "url": "http://a:8080/1",')
        expect(tokens).toContainEqual({text: '"url"', type: 'key'})
        expect(tokens).toContainEqual({text: '"http://a:8080/1"', type: 'string'})
        expect(tokens.filter(t => t.type === 'number')).toEqual([])
    })
    it('이스케이프 따옴표가 있는 문자열', () => {
        const tokens = tokenizeJsonLine('  "q": "say \\"hi\\"",')
        expect(tokens).toContainEqual({text: '"say \\"hi\\""', type: 'string'})
    })
})

describe('extractLineValue', () => {
    it('문자열 값은 따옴표 벗겨서 반환', () => {
        expect(extractLineValue('  "name": "홍길동",')).toBe('홍길동')
    })
    it('숫자 값은 그대로', () => {
        expect(extractLineValue('"age": 30,')).toBe('30')
    })
    it('키 없는 배열 요소', () => {
        expect(extractLineValue('    "Java",')).toBe('Java')
        expect(extractLineValue('    42,')).toBe('42')
    })
    it('구조 문자는 트림된 그대로', () => {
        expect(extractLineValue('  },')).toBe('}')
    })
    it('이스케이프가 포함된 문자열 디코딩', () => {
        expect(extractLineValue('"m": "a\\"b",')).toBe('a"b')
    })
})
