import {describe, expect, it} from 'vitest'
import {createWordGuessState, isWin, judgeGuess, pickWord, submitGuess} from './wordGuess'

describe('pickWord', () => {
    it('지정한 글자 수의 단어를 반환한다', () => {
        const word = pickWord(2, () => 0)
        expect(word.length).toBe(2)
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
