import {describe, expect, it} from 'vitest'
import {convertCase} from './caseConvert'

// 기준값은 각 케이스 규칙으로 손으로 계산.
describe('convertCase — camel 소스에서 각 타깃', () => {
    const src = 'myVariableName'
    it('camel → snake', () => expect(convertCase(src, 'camel', 'snake')).toBe('my_variable_name'))
    it('camel → kebab', () => expect(convertCase(src, 'camel', 'kebab')).toBe('my-variable-name'))
    it('camel → constant', () => expect(convertCase(src, 'camel', 'constant')).toBe('MY_VARIABLE_NAME'))
    it('camel → pascal', () => expect(convertCase(src, 'camel', 'pascal')).toBe('MyVariableName'))
    it('camel → title', () => expect(convertCase(src, 'camel', 'title')).toBe('My Variable Name'))
    it('camel → dot', () => expect(convertCase(src, 'camel', 'dot')).toBe('my.variable.name'))
})

describe('convertCase — 다양한 소스 파싱', () => {
    it('snake → camel', () => expect(convertCase('user_id_number', 'snake', 'camel')).toBe('userIdNumber'))
    it('kebab → pascal', () => expect(convertCase('user-id', 'kebab', 'pascal')).toBe('UserId'))
    it('constant → camel', () => expect(convertCase('MY_CONST_VALUE', 'constant', 'camel')).toBe('myConstValue'))
    it('dot → snake', () => expect(convertCase('a.b.c', 'dot', 'snake')).toBe('a_b_c'))
    it('title → kebab', () => expect(convertCase('Hello World Foo', 'title', 'kebab')).toBe('hello-world-foo'))
    it('pascal → constant', () => expect(convertCase('HttpServerError', 'pascal', 'constant')).toBe('HTTP_SERVER_ERROR'))
})

describe('convertCase — 경계', () => {
    it('빈 문자열은 빈 문자열', () => expect(convertCase('', 'camel', 'snake')).toBe(''))
    it('연속 구분자·앞뒤 구분자는 빈 단어를 버린다', () => {
        expect(convertCase('__a__b__', 'snake', 'kebab')).toBe('a-b')
    })
    it('단일 단어는 그대로(소문자화)', () => {
        expect(convertCase('Hello', 'pascal', 'snake')).toBe('hello')
    })
})
