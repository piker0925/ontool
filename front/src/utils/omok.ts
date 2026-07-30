export const OMOK_SIZE = 15

export function createEmptyOmokBoard(): number[][] {
    return Array.from({length: OMOK_SIZE}, () => Array(OMOK_SIZE).fill(0))
}

export function checkOmokWin(board: number[][], x: number, y: number, stone: number): boolean {
    const dirs = [
        [1, 0],  // 가로
        [0, 1],  // 세로
        [1, 1],  // 대각선 ↘
        [1, -1]  // 대각선 ↗
    ]

    for (const [dx, dy] of dirs) {
        let count = 1
        for (let step = 1; step < 5; step++) {
            const nx = x + dx * step
            const ny = y + dy * step
            if (nx >= 0 && nx < OMOK_SIZE && ny >= 0 && ny < OMOK_SIZE && board[ny][nx] === stone) {
                count++
            } else {
                break
            }
        }
        for (let step = 1; step < 5; step++) {
            const nx = x - dx * step
            const ny = y - dy * step
            if (nx >= 0 && nx < OMOK_SIZE && ny >= 0 && ny < OMOK_SIZE && board[ny][nx] === stone) {
                count++
            } else {
                break
            }
        }
        if (count >= 5) return true
    }

    return false
}
