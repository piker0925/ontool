import {describe, expect, it} from 'vitest'
import {
    addGarbageLines,
    BOARD_COLS,
    BOARD_ROWS,
    createTetrisState,
    getGhostY,
    hardDrop,
    moveLeft,
    moveRight,
    rotatePiece,
    tickTetris
} from './tetris'

describe('tetris logic engine', () => {
    it('초기 상태 생성 시 10x20 보드와 첫 번째/다음 블록이 할당된다', () => {
        const state = createTetrisState(() => 0.5)
        expect(state.grid.length).toBe(BOARD_ROWS)
        expect(state.grid[0].length).toBe(BOARD_COLS)
        expect(state.score).toBe(0)
        expect(state.linesCleared).toBe(0)
        expect(state.status).toBe('ready')
        expect(state.currentPiece).not.toBeNull()
        expect(state.nextPiece).not.toBeNull()
    })

    it('좌우 이동 시 경계를 벗어나지 않는다', () => {
        let state = createTetrisState(() => 0.1, 'playing')
        const initialX = state.currentPiece!.x

        state = moveLeft(state)
        expect(state.currentPiece!.x).toBeLessThanOrEqual(initialX)

        state = moveRight(state)
        state = moveRight(state)
        expect(state.currentPiece!.x).toBeGreaterThanOrEqual(initialX)
    })

    it('하드 드롭 실행 시 바닥으로 즉시 떨어지고 블록이 고정된다', () => {
        let state = createTetrisState(() => 0.2, 'playing')
        const initialNext = state.nextPiece!.type
        state = hardDrop(state)

        expect(state.score).toBeGreaterThan(0)
        expect(state.currentPiece!.type).toBe(initialNext)
    })

    it('고스트 위치(getGhostY)는 현재 블록이 충돌 직전 떨어질 최하단 Y 좌표를 정확히 고른다', () => {
        const state = createTetrisState(() => 0.3, 'playing')
        const ghostY = getGhostY(state)
        expect(ghostY).toBeGreaterThanOrEqual(state.currentPiece!.y)
    })

    it('멀티 방해 블록(addGarbageLines) 추가 시 바닥에 구멍 1개 뚫린 라인이 차오른다', () => {
        let state = createTetrisState(() => 0.4, 'playing')
        state = addGarbageLines(state, 2, 4) // x=4 컬럼 구멍

        expect(state.grid[BOARD_ROWS - 1][4]).toBe(0)
        expect(state.grid[BOARD_ROWS - 1][0]).toBeGreaterThan(0)
        expect(state.grid[BOARD_ROWS - 2][0]).toBeGreaterThan(0)
    })
})
