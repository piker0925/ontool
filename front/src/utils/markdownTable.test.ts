import {describe, expect, it} from 'vitest'
import {buildMarkdownTable, parseCsv, parseMarkdownTable} from './markdownTable'

describe('buildMarkdownTable', () => {
    it('행/열 데이터로 정렬된 마크다운 표 문법을 생성한다', () => {
        const rows = [
            ['이름', '나이'],
            ['홍길동', '30'],
        ]

        expect(buildMarkdownTable(rows, ['left', 'right'])).toBe([
            '| 이름 | 나이 |',
            '| :-- | --: |',
            '| 홍길동 | 30 |',
        ].join('\n'))
    })

    it('중앙 정렬은 :-: 구분자를 쓰고, 정렬을 지정하지 않은 열은 좌측 정렬 기본값을 쓴다', () => {
        const rows = [['a', 'b', 'c'], ['1', '2', '3']]

        expect(buildMarkdownTable(rows, ['center'])).toBe([
            '| a | b | c |',
            '| :-: | :-- | :-- |',
            '| 1 | 2 | 3 |',
        ].join('\n'))
    })

    it('빈 행이면 빈 문자열을 반환한다', () => {
        expect(buildMarkdownTable([])).toBe('')
    })

    it('CSV 붙여넣기 → 표 생성 → 다시 파싱(라운드트립)해도 셀 개수·내용이 원본과 일치한다', () => {
        const csv = '이름,도시,점수\n홍길동,서울,95\n김철수,부산,88'
        const original = parseCsv(csv)

        const generated = buildMarkdownTable(original, ['left', 'center', 'right'])
        // 중간 산출물(마크다운 표)이 원본 CSV 그대로가 아님을 확인 — 아무 일도 안 하는 구현 방지
        expect(generated).not.toBe(csv)
        expect(generated).toContain('|')

        const roundTripped = parseMarkdownTable(generated)
        expect(roundTripped).toHaveLength(original.length)
        roundTripped.forEach(row => expect(row).toHaveLength(original[0].length))
        expect(roundTripped).toEqual(original)
    })
})

describe('parseCsv', () => {
    it('콤마로 구분된 텍스트를 행렬로 파싱한다', () => {
        const csv = 'a,b,c\n1,2,3'
        expect(parseCsv(csv)).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
    })

    it('따옴표로 감싼 필드 안의 콤마는 셀을 분리하지 않는다', () => {
        const csv = '이름,주소\n홍길동,"서울시, 강남구"'
        expect(parseCsv(csv)).toEqual([
            ['이름', '주소'],
            ['홍길동', '서울시, 강남구'],
        ])
    })

    it('따옴표 안의 이스케이프된 큰따옴표(""")를 하나의 큰따옴표로 해석한다', () => {
        const csv = '문구\n"그는 ""안녕""이라 말했다"'
        expect(parseCsv(csv)).toEqual([['문구'], ['그는 "안녕"이라 말했다']])
    })
})

describe('CSV ↔ 마크다운 표 파이프 문자 처리', () => {
    it('셀에 파이프(|)가 있어도 표 문법이 깨지지 않고 라운드트립된다', () => {
        const rows = [['연산자', '설명'], ['a|b', '파이프 OR']]
        const generated = buildMarkdownTable(rows)

        expect(parseMarkdownTable(generated)).toEqual(rows)
    })
})
