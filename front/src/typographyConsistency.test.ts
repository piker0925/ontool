import {describe, expect, it} from 'vitest'
import {readFileSync, readdirSync} from 'fs'
import {join} from 'path'

// 이슈 136 — 로딩/진행 상태 문구는 '…'(말줄임표)로 끝내고 '...'(점 세 개)를 쓰지 않는다.
// (DESIGN.md "애니메이션 · 타이포그래피" 참조)
//
// src 전체를 스캔해서 "OO 중...", "불러오는 중...", "기다리세요..." 같은 패턴이
// 재발하지 않도록 막는 회귀 가드. 특정 문자열을 그대로 다시 assert하는 게 아니라
// "로딩/진행 상태를 나타내는 한국어 키워드 옆에 점 세 개가 있으면 안 된다"는
// 구조적 불변식을 검사하므로, 문구 자체가 바뀌어도(예: "처리 중" → "처리하는 중")
// 여전히 유효하다.
const LOADING_STATE_KEYWORDS = [
    '처리 중', '등록 중', '접수 중', '불러오는 중', '로딩 중', '디코딩 중',
    '생성 중', '제출 중', '재연결 중', '두는 중', '기다리세요', '탈퇴 중',
    '보세요', '확인 중', '검사 중', '저장 중', '업로드 중', '다운로드 중',
    '전송 중', '인증 중', '동기화 중', '연결 중', '삭제 중', '복사 중',
    '전환 중', '변환 중', '이동 중',
]

function collectSourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        if (entry.name === 'node_modules') continue
        if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
            collectSourceFiles(full, out)
        } else if (entry.name.endsWith('.vue') || entry.name.endsWith('.ts')) {
            out.push(full)
        }
    }
    return out
}

describe('타이포그래피 — 로딩/진행 상태 문구 말줄임표 일관성', () => {
    it('로딩/진행 상태 키워드가 있는 줄에는 점 세 개(...) 대신 …를 사용한다', () => {
        const srcDir = join(__dirname)
        const files = collectSourceFiles(srcDir)
        const offenders: string[] = []

        for (const file of files) {
            const lines = readFileSync(file, 'utf-8').split('\n')
            lines.forEach((line, i) => {
                if (!line.includes('...')) return
                const hasLoadingKeyword = LOADING_STATE_KEYWORDS.some(kw => line.includes(kw))
                if (hasLoadingKeyword) {
                    offenders.push(`${file}:${i + 1}: ${line.trim()}`)
                }
            })
        }

        expect(offenders).toEqual([])
    })
})
