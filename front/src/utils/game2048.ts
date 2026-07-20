export type Board = number[][]

export type Direction = 'left' | 'right' | 'up' | 'down'

export interface MoveResult {
    board: Board
    scoreGained: number
    moved: boolean
}

export function createEmptyBoard(size = 4): Board {
    return Array.from({length: size}, () => Array.from({length: size}, () => 0))
}

// 한 줄을 왼쪽으로 압축·병합한다. 이미 병합된 타일은 같은 이동 안에서 다시 병합되지 않는다
// (예: [2,2,2,2] → [4,4,0,0], [8,0,0,0]이 아님).
function mergeRowLeft(row: number[]): { row: number[]; scoreGained: number } {
    const compact = row.filter(v => v !== 0)
    const merged: number[] = []
    let scoreGained = 0
    let i = 0
    while (i < compact.length) {
        if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
            const value = compact[i] * 2
            merged.push(value)
            scoreGained += value
            i += 2
        } else {
            merged.push(compact[i])
            i += 1
        }
    }
    while (merged.length < row.length) merged.push(0)
    return {row: merged, scoreGained}
}

function transpose(board: Board): Board {
    return board[0].map((_, c) => board.map(row => row[c]))
}

function reverseRows(board: Board): Board {
    return board.map(row => [...row].reverse())
}

export function move(board: Board, direction: Direction): MoveResult {
    // 모든 방향을 "왼쪽으로 병합"의 전치·반전 조합으로 통일해 로직 중복을 없앤다.
    let working = board
    if (direction === 'right') working = reverseRows(working)
    if (direction === 'up') working = transpose(working)
    if (direction === 'down') working = reverseRows(transpose(working))

    let scoreGained = 0
    const mergedRows = working.map(row => {
        const {row: mergedRow, scoreGained: gained} = mergeRowLeft(row)
        scoreGained += gained
        return mergedRow
    })

    let resultBoard = mergedRows
    if (direction === 'right') resultBoard = reverseRows(resultBoard)
    if (direction === 'up') resultBoard = transpose(resultBoard)
    if (direction === 'down') resultBoard = transpose(reverseRows(resultBoard))

    const moved = JSON.stringify(resultBoard) !== JSON.stringify(board)
    return {board: resultBoard, scoreGained, moved}
}

export function isGameOver(board: Board): boolean {
    const size = board.length
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === 0) return false
            if (c + 1 < size && board[r][c] === board[r][c + 1]) return false
            if (r + 1 < size && board[r][c] === board[r + 1][c]) return false
        }
    }
    return true
}

export function addRandomTile(board: Board, random: () => number = Math.random): Board {
    const empties: Array<[number, number]> = []
    board.forEach((row, r) => row.forEach((v, c) => {
        if (v === 0) empties.push([r, c])
    }))
    if (empties.length === 0) return board

    const [r, c] = empties[Math.floor(random() * empties.length)]
    const value = random() < 0.9 ? 2 : 4
    const next = board.map(row => [...row])
    next[r][c] = value
    return next
}
