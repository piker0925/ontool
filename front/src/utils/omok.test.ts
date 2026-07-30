import {describe, expect, it} from 'vitest'
import {checkOmokWin, createEmptyOmokBoard} from './omok'

describe('omok logic', () => {
    it('15x15 빈 보드가 올바르게 생성된다', () => {
        const board = createEmptyOmokBoard()
        expect(board.length).toBe(15)
        expect(board[0].length).toBe(15)
        expect(board[0][0]).toBe(0)
    })

    it('가로 5연속 착수 시 승리 판정이 발동한다', () => {
        const board = createEmptyOmokBoard()
        for (let x = 3; x <= 7; x++) {
            board[5][x] = 1
        }
        expect(checkOmokWin(board, 7, 5, 1)).toBe(true)
    })

    it('대각선 5연속 착수 시 승리 판정이 발동한다', () => {
        const board = createEmptyOmokBoard()
        for (let i = 0; i < 5; i++) {
            board[i][i] = 2
        }
        expect(checkOmokWin(board, 4, 4, 2)).toBe(true)
    })
})
