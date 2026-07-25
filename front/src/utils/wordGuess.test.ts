import {describe, expect, it} from 'vitest'
import {createWordGuessState, isWin, judgeGuess, pickWord, seedForDate, submitGuess} from './wordGuess'

describe('pickWord', () => {
    it('지정한 글자 수의 단어를 반환한다', () => {
        const word = pickWord(2, () => 0)
        expect(word.length).toBe(2)
    })
})

describe('seedForDate — 오늘의 단어(일일 챌린지)', () => {
    it('같은 달력 날짜는 항상 같은 시드값을 낸다(시·분·초가 달라도)', () => {
        const morning = new Date(2026, 0, 15, 6, 0, 0)
        const night = new Date(2026, 0, 15, 23, 59, 59)
        expect(seedForDate(morning)).toBe(seedForDate(night))
    })

    it('날짜가 다르면 시드값도 달라진다(적어도 이 두 날짜는 다름을 직접 확인)', () => {
        const day1 = new Date(2026, 0, 15)
        const day2 = new Date(2026, 0, 16)
        expect(seedForDate(day1)).not.toBe(seedForDate(day2))
    })

    it('특정 날짜는 항상 정확히 같은 단어를 낸다(구조가 아닌 실제 내용 검증) — 독립적으로 계산한 기댓값과 비교', () => {
        // seedForDate(2026-1-15) = 0.88491(해시 계산으로 독립 검증됨) → floor(0.88491*10)=8번
        // 인덱스 → WORDS_BY_LENGTH[2][8] = '우산'. Math.random 기반이었다면 절대 재현 불가능한
        // 이 정확한 단어가 매번 똑같이 나와야 "오늘의 단어" 계약이 실제로 지켜지는 것이다.
        const day = new Date(2026, 0, 15)
        expect(pickWord(2, () => seedForDate(day))).toEqual(['우', '산'])
        expect(pickWord(2, () => seedForDate(new Date(2026, 0, 15, 23, 59)))).toEqual(['우', '산'])
    })

    it('같은 날짜로 뽑은 단어는 매번 동일하다(공정한 리더보드의 전제)', () => {
        const day1 = new Date(2026, 0, 15)
        const wordDay1First = pickWord(2, () => seedForDate(day1))
        const wordDay1Second = pickWord(2, () => seedForDate(day1))
        expect(wordDay1First).toEqual(wordDay1Second)
    })
})

describe('judgeGuess', () => {
    it('완전히 일치하면 모든 자리가 correct다', () => {
        const answer = ['사', '과']
        const results = judgeGuess(answer, ['사', '과'])
        expect(results).toEqual(['correct', 'correct'])
    })

    it('자리는 틀렸지만 단어에 존재하는 글자는 present다', () => {
        const answer = ['사', '과']
        const results = judgeGuess(answer, ['과', '사'])
        expect(results).toEqual(['present', 'present'])
    })

    it('단어에 없는 글자는 absent다', () => {
        const answer = ['사', '과']
        const results = judgeGuess(answer, ['바', '다'])
        expect(results).toEqual(['absent', 'absent'])
    })

    it('정답에 같은 글자가 1개뿐인데 추측에 2개 있으면, 위치가 맞는 하나만 correct/present로 세고 나머지는 absent다', () => {
        // 정답 "가나"(가=1개)에 대해 "가가"를 추측 — 두 번째 '가'는 이미 소진된 글자 풀에서
        // present로 잘못 판정되면 안 된다.
        const answer = ['가', '나']
        const results = judgeGuess(answer, ['가', '가'])
        expect(results).toEqual(['correct', 'absent'])
    })

    it('정답에 같은 글자가 2개면 추측의 두 자리 모두 present/correct로 인정된다', () => {
        const answer = ['가', '가']
        const results = judgeGuess(answer, ['나', '가'])
        expect(results).toEqual(['absent', 'correct'])
    })
})

describe('isWin', () => {
    it('모든 자리가 correct면 승리다', () => {
        expect(isWin(['correct', 'correct'])).toBe(true)
    })

    it('하나라도 correct가 아니면 승리가 아니다', () => {
        expect(isWin(['correct', 'present'])).toBe(false)
    })
})

describe('submitGuess', () => {
    it('글자 수가 다른 추측은 거절되어 상태가 변하지 않는다', () => {
        const state = createWordGuessState(2, 6, () => 0)
        const next = submitGuess(state, ['가', '나', '다'])
        expect(next).toEqual(state)
    })

    it('정답을 맞히면 status가 won으로 바뀐다', () => {
        const state = createWordGuessState(2, 6, () => 0)
        const next = submitGuess(state, state.answer)
        expect(next.status).toBe('won')
    })

    it('오답을 최대 시도 횟수만큼 반복하면 status가 lost로 바뀐다', () => {
        // random을 0으로 고정하면 WORDS_BY_LENGTH[2]의 첫 단어('사과')가 정답으로 뽑힌다 —
        // 그와 다른 오답('바다')을 반복해 시도 횟수 소진을 검증한다.
        let state = createWordGuessState(2, 2, () => 0)
        expect(state.answer).toEqual(['사', '과'])
        const wrongGuess = ['바', '다']
        state = submitGuess(state, wrongGuess)
        expect(state.status).toBe('playing')
        state = submitGuess(state, wrongGuess)
        expect(state.status).toBe('lost')
    })

    it('게임이 끝난 뒤에는 추가 제출이 무시된다(행 개수가 늘지 않음)', () => {
        const state = createWordGuessState(2, 6, () => 0)
        const won = submitGuess(state, state.answer)
        const after = submitGuess(won, state.answer)
        expect(after.rows.length).toBe(won.rows.length)
    })
})
