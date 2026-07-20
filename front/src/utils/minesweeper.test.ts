import {describe, expect, it} from 'vitest'
import {createMinesweeperState, placeMines, reveal, toggleFlag} from './minesweeper'

function grid(rows: string[]): boolean[][] {
    // 'X' = 지뢰, '.' = 안전
    return rows.map(row => row.split('').map(ch => ch === 'X'))
}

describe('createMinesweeperState — 인접 지뢰 수', () => {
    it('지뢰가 아닌 칸을 열면 인접 지뢰 수가 정확히 표시된다', () => {
        const mines = grid([
            '...',
            '.X.',
            '...',
        ])
        const state = createMinesweeperState(mines)
        const next = reveal(state, 0, 0)
        expect(next.grid[0][0].revealed).toBe(true)
        expect(next.grid[0][0].adjacentCount).toBe(1)
    })
})

describe('reveal — 플레이 흐름', () => {
    it('지뢰 칸을 열면 게임 오버(lost)로 판정된다', () => {
        const mines = grid([
            'X.',
            '..',
        ])
        const state = createMinesweeperState(mines)
        const next = reveal(state, 0, 0)
        expect(next.status).toBe('lost')
        expect(next.grid[0][0].revealed).toBe(true)
    })

    it('인접 지뢰가 0개인 칸을 열면 연결된 0-칸들이 함께 열린다 (flood fill)', () => {
        const mines = grid([
            '.....',
            '.....',
            '.....',
            '.....',
            '....X',
        ])
        const state = createMinesweeperState(mines)
        const next = reveal(state, 0, 0)
        const revealedCount = next.grid.flat().filter(c => c.revealed).length
        // 0-칸 하나만 열었는데 인접한 0-칸들과 그 테두리 칸들까지 연쇄로 열려야 한다
        // (단일 칸만 열리면 flood fill이 동작하지 않은 것).
        expect(revealedCount).toBeGreaterThan(1)
    })

    it('모든 안전 칸을 열면 승리(won)로 판정된다', () => {
        const mines = grid([
            'X.',
            '..',
        ])
        let state = createMinesweeperState(mines)
        state = reveal(state, 0, 1)
        state = reveal(state, 1, 0)
        expect(state.status).toBe('playing')
        state = reveal(state, 1, 1)
        expect(state.status).toBe('won')
    })

    it('깃발이 꽂힌 칸은 열리지 않는다', () => {
        const mines = grid([
            'X.',
            '..',
        ])
        let state = createMinesweeperState(mines)
        state = toggleFlag(state, 0, 0)
        state = reveal(state, 0, 0)
        expect(state.grid[0][0].revealed).toBe(false)
        expect(state.status).toBe('playing')
    })

    it('게임이 끝난 뒤(lost)에는 추가 reveal이 상태를 바꾸지 않는다', () => {
        const mines = grid([
            'X.',
            '..',
        ])
        let state = createMinesweeperState(mines)
        state = reveal(state, 0, 0)
        expect(state.status).toBe('lost')
        const afterExtra = reveal(state, 1, 1)
        expect(afterExtra.grid[1][1].revealed).toBe(false)
        expect(afterExtra.status).toBe('lost')
    })
})

describe('toggleFlag', () => {
    it('안 열린 칸의 깃발 상태를 토글한다', () => {
        const mines = grid(['..', '..'])
        let state = createMinesweeperState(mines)
        state = toggleFlag(state, 0, 0)
        expect(state.grid[0][0].flagged).toBe(true)
        state = toggleFlag(state, 0, 0)
        expect(state.grid[0][0].flagged).toBe(false)
    })
})

describe('placeMines', () => {
    it('정확히 mineCount 개수만큼, 중복 없이 배치한다', () => {
        const random = () => 0.42
        const mines = placeMines(4, 4, 5, random)
        const flat = mines.flat()
        expect(flat.filter(Boolean).length).toBe(5)
        expect(mines.length).toBe(4)
        expect(mines[0].length).toBe(4)
    })

    it('random 함수를 다르게 주면 배치도 달라진다', () => {
        const minesA = placeMines(5, 5, 6, () => 0.1)
        const minesB = placeMines(5, 5, 6, () => 0.9)
        expect(minesA).not.toEqual(minesB)
    })
})
