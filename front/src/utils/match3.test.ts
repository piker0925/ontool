import {describe, expect, it} from 'vitest'
import {
    clearAndRefill,
    createMatch3State,
    findMatches,
    type Grid,
    INITIAL_MOVES,
    isAdjacent,
    type Match3State,
    swap,
    trySwap,
} from './match3'

describe('findMatches', () => {
    it('가로로 3개 이상 이어지면 매치로 감지한다', () => {
        const grid: Grid = [
            [0, 0, 0, 1],
            [2, 3, 4, 1],
            [2, 3, 4, 1],
            [2, 3, 4, 1],
        ]
        const matches = findMatches(grid)
        expect(matches).toEqual(expect.arrayContaining([[0, 0], [0, 1], [0, 2]]))
    })

    it('세로로 3개 이상 이어지면 매치로 감지한다', () => {
        const grid: Grid = [
            [1, 2, 3, 4],
            [1, 2, 3, 4],
            [1, 2, 3, 4],
            [0, 2, 3, 4],
        ]
        const matches = findMatches(grid)
        expect(matches).toEqual(expect.arrayContaining([[0, 0], [1, 0], [2, 0]]))
    })

    it('어디에도 3개 이상 이어진 곳이 없으면 빈 배열이다', () => {
        const grid: Grid = [
            [0, 1, 2, 0],
            [1, 2, 0, 1],
            [2, 0, 1, 2],
            [0, 1, 2, 0],
        ]
        expect(findMatches(grid)).toEqual([])
    })
})

describe('isAdjacent', () => {
    it('상하좌우로 한 칸 떨어진 칸은 인접하다', () => {
        expect(isAdjacent([1, 1], [1, 2])).toBe(true)
        expect(isAdjacent([1, 1], [2, 1])).toBe(true)
    })

    it('대각선이거나 두 칸 이상 떨어지면 인접하지 않다', () => {
        expect(isAdjacent([1, 1], [2, 2])).toBe(false)
        expect(isAdjacent([1, 1], [1, 3])).toBe(false)
    })
})

describe('trySwap', () => {
    it('교환으로 매치가 만들어지면 성공하고 격자가 바뀐다', () => {
        // (0,3)의 1을 (1,3)의 0과 교환하면 0행이 [0,0,0,0]이 되어 가로 매치가 만들어진다.
        const grid: Grid = [
            [0, 0, 0, 1],
            [2, 3, 4, 0],
        ]
        const result = trySwap(grid, [0, 3], [1, 3])
        expect(result.matched).toBe(true)
        expect(result.grid[0][3]).toBe(0)
        expect(result.matches.length).toBeGreaterThan(0)
    })

    it('교환해도 매치가 안 만들어지면 되돌리고(matched:false) 격자가 그대로다', () => {
        const grid: Grid = [
            [0, 1, 2],
            [1, 2, 0],
            [2, 0, 1],
        ]
        const result = trySwap(grid, [0, 0], [0, 1])
        expect(result.matched).toBe(false)
        expect(result.grid).toBe(grid) // 되돌린 게 아니라 애초에 바뀌지 않은 원본 참조
    })

    it('인접하지 않은 칸은 매치 여부와 무관하게 거절된다', () => {
        const grid: Grid = [
            [0, 0, 1],
            [2, 3, 4],
        ]
        const result = trySwap(grid, [0, 0], [0, 2])
        expect(result.matched).toBe(false)
        expect(result.grid).toBe(grid)
    })
})

describe('clearAndRefill', () => {
    it('매치된 칸을 지우고 남은 타일은 아래로, 새 타일은 위로 채운다', () => {
        const grid: Grid = [
            [0, 9, 9, 9],
            [1, 9, 9, 9],
            [2, 9, 9, 9],
            [3, 9, 9, 9],
        ]
        const matches: Array<[number, number]> = [[0, 0], [1, 0], [2, 0]]
        const {grid: next, scoreGained} = clearAndRefill(grid, matches, () => 0.99) // floor(0.99*5)=4로 새 타일 식별

        expect(scoreGained).toBe(3)
        expect(next[3][0]).toBe(3) // 매치되지 않은 맨 아래 타일은 그대로 바닥에 남는다
        expect(next[0][0]).toBe(4)
        expect(next[1][0]).toBe(4)
        expect(next[2][0]).toBe(4)
        // 매치에 포함되지 않은 다른 열들은 전혀 영향받지 않는다
        expect(next.map(row => row[1])).toEqual([9, 9, 9, 9])
    })
})

describe('createMatch3State', () => {
    it('기본 이동 횟수·점수 0·playing 상태로 시작한다', () => {
        const state = createMatch3State(8, INITIAL_MOVES, () => 0.5)
        expect(state.movesLeft).toBe(INITIAL_MOVES)
        expect(state.score).toBe(0)
        expect(state.status).toBe('playing')
    })
})

describe('swap — 121 리더보드용 이동 제한 모드', () => {
    function stateWith(overrides: Partial<Match3State>): Match3State {
        return {grid: [], score: 0, movesLeft: INITIAL_MOVES, status: 'playing', ...overrides}
    }

    it('매치가 만들어지는 교환은 이동을 1 소모하고 점수가 오른다', () => {
        const grid: Grid = [
            [0, 0, 0, 1],
            [2, 3, 4, 0],
        ]
        const state = stateWith({grid, movesLeft: 5})
        const next = swap(state, [0, 3], [1, 3], () => 0.5)

        expect(next.movesLeft).toBe(4)
        expect(next.score).toBeGreaterThan(0)
        expect(next.status).toBe('playing')
    })

    it('매치가 안 만들어지는 교환은 이동을 소모하지 않는다(같은 참조 반환)', () => {
        const grid: Grid = [
            [0, 1, 2],
            [1, 2, 0],
            [2, 0, 1],
        ]
        const state = stateWith({grid, movesLeft: 5})
        const next = swap(state, [0, 0], [0, 1], () => 0.5)

        expect(next).toBe(state)
        expect(next.movesLeft).toBe(5)
    })

    it('마지막 이동에서 매치가 만들어지면 이동 소모 후 게임이 종료된다', () => {
        const grid: Grid = [
            [0, 0, 0, 1],
            [2, 3, 4, 0],
        ]
        const state = stateWith({grid, movesLeft: 1})
        const next = swap(state, [0, 3], [1, 3], () => 0.5)

        expect(next.movesLeft).toBe(0)
        expect(next.status).toBe('over')
    })

    it('게임이 끝난 뒤에는 매치가 되는 교환이라도 상태가 바뀌지 않는다', () => {
        const grid: Grid = [
            [0, 0, 0, 1],
            [2, 3, 4, 0],
        ]
        const state = stateWith({grid, movesLeft: 0, status: 'over'})
        const next = swap(state, [0, 3], [1, 3], () => 0.5)

        expect(next).toBe(state)
    })
})
