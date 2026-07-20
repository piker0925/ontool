export type Cell = 'X' | 'O' | null
export type Board = Cell[]

const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
]

// 중앙 > 코너 > 변 순서로 시도 — 즉시 이기거나 막을 수가 없을 때의 기본 우선순위.
const PRIORITY = [4, 0, 2, 6, 8, 1, 3, 5, 7]

export function checkWinner(board: Board): Cell {
    for (const [a, b, c] of LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
    }
    return null
}

export function isDraw(board: Board): boolean {
    return checkWinner(board) === null && board.every(c => c !== null)
}

function findWinningMove(board: Board, player: Cell): number | null {
    for (let i = 0; i < board.length; i++) {
        if (board[i] !== null) continue
        const copy = [...board]
        copy[i] = player
        if (checkWinner(copy) === player) return i
    }
    return null
}

export function computerMove(board: Board, computer: 'X' | 'O', human: 'X' | 'O'): number {
    const winMove = findWinningMove(board, computer)
    if (winMove !== null) return winMove

    const blockMove = findWinningMove(board, human)
    if (blockMove !== null) return blockMove

    return PRIORITY.find(i => board[i] === null)!
}
