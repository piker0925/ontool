import {describe, expect, it} from 'vitest'
import {canMove, createSolvedBoard, isSolved, move, shuffle} from './slidingPuzzle'

describe('createSolvedBoard', () => {
    it('1부터 size*size-1까지 순서대로 두고 마지막 칸을 빈칸(0)으로 둔다', () => {
        const board = createSolvedBoard(4)
        expect(board).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0])
    })
})

describe('isSolved', () => {
    it('완성 배치는 true', () => {
        expect(isSolved(createSolvedBoard(4))).toBe(true)
    })

    it('한 칸이라도 어긋나면 false', () => {
        const board = createSolvedBoard(4)
        ;[board[0], board[1]] = [board[1], board[0]]
        expect(isSolved(board)).toBe(false)
    })
})

describe('canMove / move', () => {
    // 빈칸이 인덱스 15(마지막)인 완성 배치 기준: 인접 칸은 11(위)과 14(왼쪽)뿐이다.
    it('빈칸과 인접한 칸은 이동 가능하다', () => {
        const board = createSolvedBoard(4)
        expect(canMove(board, 11, 4)).toBe(true)
        expect(canMove(board, 14, 4)).toBe(true)
    })

    it('빈칸과 인접하지 않은 칸은 이동 불가능하다', () => {
        const board = createSolvedBoard(4)
        expect(canMove(board, 0, 4)).toBe(false)
        expect(canMove(board, 5, 4)).toBe(false)
    })

    it('인접한 칸을 이동하면 그 칸의 숫자와 빈칸이 교체된다', () => {
        const board = createSolvedBoard(4)
        const next = move(board, 14, 4)
        expect(next[14]).toBe(0)
        expect(next[15]).toBe(15)
    })

    it('이동 불가능한 칸에 move를 호출하면 배치가 변하지 않는다(같은 값 유지)', () => {
        const board = createSolvedBoard(4)
        const next = move(board, 0, 4)
        expect(next).toEqual(board)
    })
})

describe('shuffle', () => {
    it('유효한 이동만으로 만들어지므로 결과는 완성 배치와 달라야 한다(사실상 항상 섞임)', () => {
        const board = shuffle(4, 200, () => 0.5)
        expect(isSolved(board)).toBe(false)
    })

    it('셔플 결과는 항상 1~15와 0을 정확히 하나씩만 포함한다(값 손실·중복 없음)', () => {
        const board = shuffle(4, 50, () => 0.7)
        expect([...board].sort((a, b) => a - b)).toEqual(createSolvedBoard(4).slice().sort((a, b) => a - b))
    })

    it('직전에 빈칸이 있던 자리로 곧장 되돌아가지 않는다(같은 이동 반복으로 인한 사실상 무의미한 셔플 방지)', () => {
        // random()이 항상 0을 반환해 매번 첫 번째 후보를 고르더라도, prevBlank 제외 로직 덕분에
        // 이동이 단조 왕복(핑퐁)하지 않고 실제로 여러 칸을 옮겨 다녀야 한다.
        const board = shuffle(4, 20, () => 0)
        expect(isSolved(board)).toBe(false)
    })
})
