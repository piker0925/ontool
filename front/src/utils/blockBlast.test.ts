import {describe, expect, it} from 'vitest'
import {
    type BlockBlastState,
    canPlace,
    clearLines,
    createEmptyGrid,
    type Grid,
    hasAnyValidMove,
    place,
    type Piece,
    placePiece,
} from './blockBlast'

const SQUARE: Piece = {id: 'square', cells: [[0, 0], [0, 1], [1, 0], [1, 1]]}
const SINGLE: Piece = {id: 'single', cells: [[0, 0]]}

describe('canPlace', () => {
    it('빈 격자 안이면 배치 가능하다', () => {
        const grid = createEmptyGrid(8)
        expect(canPlace(grid, SQUARE, 0, 0)).toBe(true)
    })

    it('격자 경계를 벗어나면 배치 불가능하다', () => {
        const grid = createEmptyGrid(8)
        expect(canPlace(grid, SQUARE, 7, 7)).toBe(false)
    })

    it('이미 채워진 칸과 겹치면 배치 불가능하다', () => {
        const grid = createEmptyGrid(8)
        grid[0][0] = true
        expect(canPlace(grid, SQUARE, 0, 0)).toBe(false)
    })
})

describe('placePiece', () => {
    it('배치 가능하면 조각의 모든 칸이 채워진다', () => {
        const grid = createEmptyGrid(8)
        const next = placePiece(grid, SQUARE, 2, 2)
        expect(next[2][2]).toBe(true)
        expect(next[2][3]).toBe(true)
        expect(next[3][2]).toBe(true)
        expect(next[3][3]).toBe(true)
    })

    it('배치 불가능하면 격자가 변하지 않는다(같은 참조 반환)', () => {
        const grid = createEmptyGrid(8)
        grid[0][0] = true
        const next = placePiece(grid, SQUARE, 0, 0)
        expect(next).toBe(grid)
    })
})

describe('clearLines', () => {
    it('가득 찬 행 하나만 지워지고 다른 행은 그대로 남는다', () => {
        const grid = createEmptyGrid(4)
        grid[1] = [true, true, true, true]
        grid[2][0] = true // 이 칸은 지워지지 않아야 함(2행은 가득 차지 않음)
        const {grid: next, scoreGained} = clearLines(grid)
        expect(next[1]).toEqual([false, false, false, false])
        expect(next[2][0]).toBe(true)
        expect(scoreGained).toBe(4)
    })

    it('가득 찬 행과 열이 교차해도 교차 칸은 한 번만 센다', () => {
        const grid = createEmptyGrid(4)
        grid[0] = [true, true, true, true] // 0행 가득 참
        for (let r = 0; r < 4; r++) grid[r][0] = true // 0열 가득 참
        const {scoreGained} = clearLines(grid)
        // 0행(4칸) + 0열(4칸) - 교차점(0,0) 중복 1칸 = 7칸
        expect(scoreGained).toBe(7)
    })

    it('가득 찬 줄이 없으면 아무것도 지워지지 않는다', () => {
        const grid = createEmptyGrid(4)
        grid[0][0] = true
        const {grid: next, scoreGained} = clearLines(grid)
        expect(scoreGained).toBe(0)
        expect(next[0][0]).toBe(true)
    })
})

describe('hasAnyValidMove', () => {
    it('빈 격자에서는 항상 참이다', () => {
        const grid = createEmptyGrid(8)
        expect(hasAnyValidMove(grid, [SQUARE])).toBe(true)
    })

    it('격자가 완전히 가득 차면 1칸짜리 조각도 놓을 곳이 없어 거짓이다', () => {
        const grid: Grid = Array.from({length: 8}, () => Array.from({length: 8}, () => true))
        expect(hasAnyValidMove(grid, [SINGLE])).toBe(false)
    })

    it('조각 하나는 못 놓아도 다른 조각을 놓을 수 있으면 참이다', () => {
        const grid: Grid = Array.from({length: 8}, () => Array.from({length: 8}, () => true))
        grid[0][0] = false // 1칸만 비어있음 — SQUARE(2x2)는 못 놓지만 SINGLE은 놓을 수 있다
        expect(hasAnyValidMove(grid, [SQUARE, SINGLE])).toBe(true)
    })

    it('null(이미 소진된) 조각 자리는 무시한다', () => {
        const grid = createEmptyGrid(8)
        expect(hasAnyValidMove(grid, [null, null])).toBe(false)
    })
})

describe('place', () => {
    function stateWith(overrides: Partial<BlockBlastState>): BlockBlastState {
        return {grid: createEmptyGrid(8), pieces: [SINGLE, SINGLE, SINGLE], score: 0, status: 'playing', ...overrides}
    }

    it('배치 가능한 자리에 놓으면 격자가 채워지고 그 조각 자리는 null이 된다', () => {
        const state = stateWith({})
        const next = place(state, 0, 3, 3)
        expect(next.grid[3][3]).toBe(true)
        expect(next.pieces[0]).toBeNull()
        expect(next.pieces[1]).toEqual(SINGLE) // 다른 조각 자리는 그대로
    })

    it('겹치는 자리에 놓으려 하면 실패하고 상태가 변하지 않는다', () => {
        const grid = createEmptyGrid(8)
        grid[3][3] = true
        const state = stateWith({grid})
        const next = place(state, 0, 3, 3)
        expect(next).toEqual(state)
    })

    it('줄이 가득 차면 점수에 (놓은 칸 수 + 지워진 칸 수)가 합산된다', () => {
        const grid = createEmptyGrid(4)
        for (let c = 0; c < 3; c++) grid[0][c] = true // 0행의 마지막 한 칸만 비어있음
        const state = stateWith({grid, pieces: [SINGLE, SINGLE, SINGLE]})
        const next = place(state, 0, 0, 3)
        expect(next.score).toBe(1 + 4) // SINGLE 1칸 + 클리어된 4칸
        expect(next.grid[0]).toEqual([false, false, false, false])
    })

    it('3개 조각을 모두 사용하면 새 조각 3개로 자동 보충된다', () => {
        const state = stateWith({pieces: [SINGLE, null, null]})
        const next = place(state, 0, 0, 0, () => 0)
        expect(next.pieces.every(p => p !== null)).toBe(true)
    })

    it('마지막 조각을 놓은 뒤 남은 조각을 놓을 곳이 없으면 게임 오버가 된다', () => {
        // 5x5 격자를 거의 다 채우되, (0,0)에 놓을 SINGLE의 행(0)·열(0)에는 각각 여분의 빈 칸을
        // 하나씩 더 남겨(0,4)/(4,0) 두어 이번 배치로 줄이 완성되지 않게 한다(클리어 없이 순수
        // "더 놓을 곳 없음"만 검증하기 위함). 나머지 빈 칸(1,1)/(2,2)/(3,3)/(4,4)은 서로
        // 대각선으로만 떨어져 있어 어떤 2x2 자리에도 4칸이 동시에 비어있지 않다 — 남은 조각인
        // SQUARE(2x2)는 이제 놓을 곳이 없다.
        const grid: Grid = Array.from({length: 5}, () => Array.from({length: 5}, () => true))
        const emptyCells: Array<[number, number]> = [[0, 0], [0, 4], [4, 0], [1, 1], [2, 2], [3, 3], [4, 4]]
        emptyCells.forEach(([r, c]) => {
            grid[r][c] = false
        })
        const state = stateWith({grid, pieces: [SINGLE, SQUARE, null]})

        const next = place(state, 0, 0, 0)
        expect(next.grid[0][4]).toBe(false) // 줄 클리어가 일어나지 않았음을 확인(행의 다른 빈 칸이 그대로 남음)
        expect(next.grid[4][0]).toBe(false) // 열도 마찬가지
        expect(next.status).toBe('over')
    })
})
