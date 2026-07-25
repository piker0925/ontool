// 15퍼즐: size*size 칸 중 하나(0)가 빈칸이다. 빈칸과 인접한 타일만 그 자리로 이동할 수 있다.
export type Board = number[]

export function createSolvedBoard(size = 4): Board {
    const board: Board = []
    for (let i = 1; i < size * size; i++) board.push(i)
    board.push(0)
    return board
}

export function isSolved(board: Board): boolean {
    const solved = createSolvedBoard(Math.sqrt(board.length))
    return board.every((v, i) => v === solved[i])
}

function blankIndex(board: Board): number {
    return board.indexOf(0)
}

// 빈칸과 상하좌우로 인접한 칸의 인덱스만 반환한다(대각선 제외, 격자 경계 넘어가지 않음).
function adjacentIndices(index: number, size: number): number[] {
    const row = Math.floor(index / size)
    const col = index % size
    const result: number[] = []
    if (row > 0) result.push(index - size)
    if (row < size - 1) result.push(index + size)
    if (col > 0) result.push(index - 1)
    if (col < size - 1) result.push(index + 1)
    return result
}

export function canMove(board: Board, index: number, size: number): boolean {
    if (index < 0 || index >= board.length) return false
    if (board[index] === 0) return false
    return adjacentIndices(blankIndex(board), size).includes(index)
}

// 이동 불가능한 타일을 누르면 아무 일도 일어나지 않는다 — 같은 board 참조를 그대로 반환한다.
export function move(board: Board, index: number, size: number): Board {
    if (!canMove(board, index, size)) return board
    const blank = blankIndex(board)
    const next = [...board]
    next[blank] = board[index]
    next[index] = 0
    return next
}

// 완성 상태에서 시작해 "실제로 가능한 이동"만 반복 적용한다 — Fisher-Yates 셔플과 달리
// 15퍼즐의 절반은 셔플만으로는 풀 수 없는 배치가 나오는데, 유효한 이동만 쌓으면 항상 풀 수 있는
// 배치가 보장된다(가역적인 이동의 역연산이 곧 정답 경로이므로).
export function shuffle(size = 4, moveCount = 200, random: () => number = Math.random): Board {
    let board = createSolvedBoard(size)
    let prevBlank = -1
    for (let i = 0; i < moveCount; i++) {
        const blank = blankIndex(board)
        const candidates = adjacentIndices(blank, size).filter(idx => idx !== prevBlank)
        const pick = candidates[Math.floor(random() * candidates.length)]
        prevBlank = blank
        board = move(board, pick, size)
    }
    return board
}
