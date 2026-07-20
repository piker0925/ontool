import {describe, expect, it} from 'vitest'
import {addRandomTile, createEmptyBoard, isGameOver, move} from './game2048'

function sequence(values: number[]) {
    let i = 0
    return () => values[Math.min(i++, values.length - 1)]
}

describe('move — left', () => {
    it('같은 숫자 타일 2개가 합쳐지면 값이 2배가 되고 점수에 반영된다', () => {
        const board = [
            [2, 2, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ]
        const result = move(board, 'left')
        expect(result.board[0]).toEqual([4, 0, 0, 0])
        expect(result.scoreGained).toBe(4)
        expect(result.moved).toBe(true)
    })

    it('한 번의 이동에서 타일은 한 번만 병합된다 (연쇄 병합 금지)', () => {
        const board = [
            [2, 2, 2, 2],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ]
        const result = move(board, 'left')
        expect(result.board[0]).toEqual([4, 4, 0, 0])
        expect(result.scoreGained).toBe(8)
    })

    it('이동해도 보드가 바뀌지 않으면 moved=false', () => {
        const board = [
            [2, 4, 8, 16],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ]
        const result = move(board, 'left')
        expect(result.board[0]).toEqual([2, 4, 8, 16])
        expect(result.moved).toBe(false)
        expect(result.scoreGained).toBe(0)
    })
})

describe('move — 방향별', () => {
    it('right: 오른쪽 끝으로 정렬되며 병합된다', () => {
        const board = [
            [2, 2, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ]
        const result = move(board, 'right')
        expect(result.board[0]).toEqual([0, 0, 0, 4])
    })

    it('up: 위쪽 끝으로 정렬되며 병합된다', () => {
        const board = [
            [2, 0, 0, 0],
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ]
        const result = move(board, 'up')
        expect(result.board.map(row => row[0])).toEqual([4, 0, 0, 0])
    })

    it('down: 아래쪽 끝으로 정렬되며 병합된다', () => {
        const board = [
            [2, 0, 0, 0],
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ]
        const result = move(board, 'down')
        expect(result.board.map(row => row[0])).toEqual([0, 0, 0, 4])
    })
})

describe('isGameOver', () => {
    it('보드가 가득 찼고 인접 병합이 불가능하면 게임 오버다', () => {
        const board = [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2],
        ]
        expect(isGameOver(board)).toBe(true)
    })

    it('보드가 가득 차도 인접한 병합 가능 쌍이 있으면 게임 오버가 아니다', () => {
        const board = [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 2, 4],
        ]
        expect(isGameOver(board)).toBe(false)
    })

    it('빈 칸이 남아있으면 병합 가능 여부와 무관하게 게임 오버가 아니다', () => {
        const board = createEmptyBoard(4)
        expect(isGameOver(board)).toBe(false)
    })
})

describe('addRandomTile', () => {
    it('빈 칸이 하나뿐이면 그 칸에 타일을 놓는다', () => {
        const board = [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 0],
        ]
        const random = sequence([0, 0.5])
        const result = addRandomTile(board, random)
        expect(result[3][3]).toBe(2)
    })

    it('90% 미만이면 2, 이상이면 4를 놓는다', () => {
        const board = [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 0],
        ]
        const result = addRandomTile(board, sequence([0, 0.95]))
        expect(result[3][3]).toBe(4)
    })

    it('여러 빈 칸 중 random 인덱스가 가리키는 칸에 정확히 놓는다', () => {
        const board = createEmptyBoard(2) // 4칸 모두 비어있음: (0,0)(0,1)(1,0)(1,1)
        const result = addRandomTile(board, sequence([0.99, 0.1])) // idx = floor(0.99*4) = 3 → (1,1)
        expect(result[1][1]).not.toBe(0)
        expect(result[0][0]).toBe(0)
        expect(result[0][1]).toBe(0)
        expect(result[1][0]).toBe(0)
    })

    it('빈 칸이 없으면 보드를 그대로 반환한다', () => {
        const board = [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2],
        ]
        const result = addRandomTile(board, sequence([0, 0]))
        expect(result).toEqual(board)
    })
})
