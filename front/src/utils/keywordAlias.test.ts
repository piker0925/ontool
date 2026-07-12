import {describe, expect, it} from 'vitest'
import {keywordStrings, resolveAliasQuery} from './keywordAlias'
import type {ModuleKeyword} from '../types'

const ENCODER_KEYWORDS: ModuleKeyword[] = [
    {keyword: 'base64', query: 'mode=base64-encode'},
    {keyword: 'url encode', query: 'mode=url-encode'},
    {keyword: 'html entity', query: 'mode=html-encode'},
    '인코딩',
    '디코딩',
]

describe('keywordStrings', () => {
    it('문자열과 객체가 섞인 별칭에서 검색 문자열만 추출한다', () => {
        expect(keywordStrings(ENCODER_KEYWORDS)).toEqual([
            'base64', 'url encode', 'html entity', '인코딩', '디코딩',
        ])
    })

    it('keywords가 없으면 빈 배열을 반환한다', () => {
        expect(keywordStrings(undefined)).toEqual([])
    })
})

describe('resolveAliasQuery', () => {
    it('검색어가 딥링크 별칭과 일치하면 해당 query를 반환한다', () => {
        expect(resolveAliasQuery(ENCODER_KEYWORDS, 'base64')).toBe('mode=base64-encode')
    })

    it('대소문자를 무시하고 부분 일치를 허용한다', () => {
        expect(resolveAliasQuery(ENCODER_KEYWORDS, 'Base6')).toBe('mode=base64-encode')
        expect(resolveAliasQuery(ENCODER_KEYWORDS, 'html entity 인코드')).toBe('mode=html-encode')
    })

    it('query 없는 문자열 별칭과 일치해도 딥링크로 취급하지 않는다', () => {
        expect(resolveAliasQuery(ENCODER_KEYWORDS, '인코딩')).toBeNull()
    })

    it('일치하는 별칭이 없거나 검색어가 비어 있으면 null을 반환한다', () => {
        expect(resolveAliasQuery(ENCODER_KEYWORDS, 'uuid')).toBeNull()
        expect(resolveAliasQuery(ENCODER_KEYWORDS, '  ')).toBeNull()
        expect(resolveAliasQuery(undefined, 'base64')).toBeNull()
    })

    it('여러 별칭이 일치하면 더 긴(구체적인) 별칭의 query를 택한다', () => {
        const kws: ModuleKeyword[] = [
            {keyword: 'url', query: 'tab=url'},
            {keyword: 'url encode', query: 'mode=url-encode'},
        ]
        expect(resolveAliasQuery(kws, 'url encode')).toBe('mode=url-encode')
    })
})
