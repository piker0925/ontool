import {describe, expect, it} from 'vitest'
import {generateToc} from './markdownToc'

describe('generateToc', () => {
    it('헤딩 레벨에 따라 들여쓰기 깊이가 정확히 대응한다', () => {
        const md = [
            '# 소개',
            '## 설치',
            '### 요구사항',
            '## 사용법',
        ].join('\n')

        expect(generateToc(md)).toBe([
            '- [소개](#소개)',
            '  - [설치](#설치)',
            '    - [요구사항](#요구사항)',
            '  - [사용법](#사용법)',
        ].join('\n'))
    })

    it('중복 헤딩명은 GitHub slug 규칙대로 -1, -2가 순서대로 붙는다', () => {
        const md = ['# 제목', '# 제목', '# 제목'].join('\n')

        expect(generateToc(md)).toBe([
            '- [제목](#제목)',
            '- [제목](#제목-1)',
            '- [제목](#제목-2)',
        ].join('\n'))
    })

    it('본문 텍스트나 코드는 헤딩으로 취급하지 않는다', () => {
        const md = [
            '# 소개',
            '이건 그냥 문단입니다.',
            '#해시태그아님',
            '## 다음 섹션',
        ].join('\n')

        expect(generateToc(md)).toBe([
            '- [소개](#소개)',
            '  - [다음 섹션](#다음-섹션)',
        ].join('\n'))
    })

    it('코드 펜스(```) 안의 #으로 시작하는 줄은 헤딩으로 취급하지 않는다', () => {
        const md = [
            '# 실제 제목',
            '```bash',
            '# 이건 쉘 주석입니다',
            '```',
            '## 다음 섹션',
        ].join('\n')

        expect(generateToc(md)).toBe([
            '- [실제 제목](#실제-제목)',
            '  - [다음 섹션](#다음-섹션)',
        ].join('\n'))
    })

    it('헤딩이 없으면 빈 문자열을 반환한다', () => {
        expect(generateToc('그냥 본문')).toBe('')
    })

    it('하위 레벨에서 상위 레벨로 돌아가면 들여쓰기도 함께 줄어든다', () => {
        const md = ['# A', '### B', '# C'].join('\n')

        expect(generateToc(md)).toBe([
            '- [A](#a)',
            '    - [B](#b)',
            '- [C](#c)',
        ].join('\n'))
    })
})
