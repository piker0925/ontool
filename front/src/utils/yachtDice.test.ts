import {describe, expect, it} from 'vitest'
import {calculateCategoryScore, createYachtState, rerollDice, toggleKeepDice} from './yachtDice'

describe('yachtDice game engine', () => {
    it('초기 상태 생성 시 주사위가 비어있고 남은 굴리기 횟수가 3이다', () => {
        const state = createYachtState()
        expect(state.dice.length).toBe(0)
        expect(state.rerollsLeft).toBe(3)
        expect(state.status).toBe('playing')
    })

    it('첫 굴리기 후 주사위 고정(toggleKeepDice) 및 재굴리기(rerollDice) 시 고정되지 않은 주사위만 갱신된다', () => {
        let state = createYachtState()
        state = rerollDice(state)
        expect(state.dice.length).toBe(5)
        expect(state.rerollsLeft).toBe(2)

        state = toggleKeepDice(state, 0)
        expect(state.kept[0]).toBe(true)

        const oldDice0 = state.dice[0]
        state = rerollDice(state)
        expect(state.dice[0]).toBe(oldDice0) // 고정된 0번 주사위는 안 바뀜
        expect(state.rerollsLeft).toBe(1)
    })

    it('Yacht 족보 계산(5개 모두 동일 숫자인 경우 50점)이 정확하다', () => {
        const dice = [4, 4, 4, 4, 4]
        const score = calculateCategoryScore('yacht', dice)
        expect(score).toBe(50)
    })
})
