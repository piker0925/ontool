import {describe, expect, it} from 'vitest'
import {type Board, checkWinner, computerMove, isDraw} from './tictactoe'

describe('checkWinner', () => {
    it('가로·세로·대각선 승리를 판정한다', () => {
        const row: Board = ['X', 'X', 'X', null, null, null, null, null, null]
        expect(checkWinner(row)).toBe('X')

        const col: Board = ['O', null, null, 'O', null, null, 'O', null, null]
        expect(checkWinner(col)).toBe('O')

        const diag: Board = ['X', null, null, null, 'X', null, null, null, 'X']
        expect(checkWinner(diag)).toBe('X')
    })

    it('승자가 없으면 null이다', () => {
        const board: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']
        expect(checkWinner(board)).toBe(null)
    })
})

describe('isDraw', () => {
    it('보드가 가득 찼고 승자가 없으면 무승부다', () => {
        const board: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']
        expect(isDraw(board)).toBe(true)
    })

    it('빈 칸이 남아있으면 무승부가 아니다', () => {
        const board: Board = ['X', 'O', null, null, null, null, null, null, null]
        expect(isDraw(board)).toBe(false)
    })
})

describe('computerMove — AI', () => {
    it('AI가 다음 수로 즉시 이길 수 있으면 반드시 그 수를 둔다', () => {
        // O가 0,1에 있고 2가 비어있음 → O가 2를 두면 승리
        const board: Board = ['O', 'O', null, 'X', 'X', null, null, null, null]
        const move = computerMove(board, 'O', 'X')
        expect(move).toBe(2)
    })

    it('AI가 못 막으면 상대가 이기는 상황에서는 반드시 막는다', () => {
        // X가 0,1에 있고 2가 비어있음 → X가 2를 두면 승리하므로 O는 반드시 2를 막아야 한다
        // (O 자신은 즉시 이길 수 있는 수가 없는 상황으로 구성)
        const board: Board = ['X', 'X', null, 'O', null, null, null, null, null]
        const move = computerMove(board, 'O', 'X')
        expect(move).toBe(2)
    })

    it('이기는 수와 막는 수가 동시에 있으면 이기는 수를 우선한다', () => {
        // O가 3,4에 있어 5를 두면 이김. 동시에 X가 0,1에 있어 2를 안 막으면 짐.
        // AI는 항상 이기는 수를 최우선해야 한다(먼저 이기면 상대가 이길 기회 자체가 없음).
        const board: Board = ['X', 'X', null, 'O', 'O', null, null, null, null]
        const move = computerMove(board, 'O', 'X')
        expect(move).toBe(5)
    })

    it('즉시 이기거나 막을 수가 없으면 다른 빈 칸(중앙 우선) 중 하나를 둔다', () => {
        const board: Board = [null, null, null, null, null, null, null, null, null]
        const move = computerMove(board, 'O', 'X')
        expect(move).toBe(4) // 첫 수는 중앙이 최우선
    })
})
