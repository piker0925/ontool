import {describe, expect, it} from 'vitest'
import {createSuikaState, FRUITS, mergeFruits, stepPhysics} from './suikaMerge'

describe('suikaMerge physics engine', () => {
    it('과일 레벨 1부터 11까지 반지름 및 점수 테이블이 존재한다', () => {
        expect(FRUITS.length).toBe(11)
        expect(FRUITS[0].name).toBe('체리')
        expect(FRUITS[10].name).toBe('수박')
        expect(FRUITS[10].radius).toBeGreaterThan(FRUITS[0].radius)
    })

    it('동일 레벨의 과일 두 개가 접촉하면 다음 레벨 과일 하나로 합성된다', () => {
        const fruitA = { id: 1, level: 0, x: 100, y: 200, vx: 0, vy: 0, radius: FRUITS[0].radius }
        const fruitB = { id: 2, level: 0, x: 110, y: 200, vx: 0, vy: 0, radius: FRUITS[0].radius }

        const result = mergeFruits([fruitA, fruitB], fruitA, fruitB, 3)
        expect(result.mergedFruit.level).toBe(1) // 체리 + 체리 ➔ 딸기
        expect(result.remainingFruits.length).toBe(1)
        expect(result.scoreGained).toBeGreaterThan(0)
    })

    it('물리 시뮬레이션(stepPhysics) 시 과일이 중력에 의해 아래로 이동하고 벽을 뚫지 않는다', () => {
        let state = createSuikaState('playing', () => 0.1)
        state.fruits.push({ id: 99, level: 0, x: 150, y: 50, vx: 0, vy: 0, radius: FRUITS[0].radius })

        const initialY = state.fruits[0].y
        state = stepPhysics(state, 100)

        expect(state.fruits[0].y).toBeGreaterThan(initialY)
        expect(state.fruits[0].x).toBeGreaterThanOrEqual(FRUITS[0].radius)
    })
})
