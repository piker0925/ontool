export interface Cell {
    hasMine: boolean
    adjacentCount: number
    revealed: boolean
    flagged: boolean
}

export type Grid = Cell[][]
export type GameStatus = 'playing' | 'won' | 'lost'

export interface MinesweeperState {
    grid: Grid
    status: GameStatus
}

const NEIGHBOR_OFFSETS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
]

function inBounds(mines: boolean[][], r: number, c: number): boolean {
    return r >= 0 && r < mines.length && c >= 0 && c < mines[0].length
}

function countAdjacentMines(mines: boolean[][], r: number, c: number): number {
    return NEIGHBOR_OFFSETS.reduce((count, [dr, dc]) => {
        const nr = r + dr
        const nc = c + dc
        return inBounds(mines, nr, nc) && mines[nr][nc] ? count + 1 : count
    }, 0)
}

export function createMinesweeperState(mines: boolean[][]): MinesweeperState {
    const grid: Grid = mines.map((row, r) =>
        row.map((hasMine, c) => ({
            hasMine,
            adjacentCount: hasMine ? 0 : countAdjacentMines(mines, r, c),
            revealed: false,
            flagged: false,
        })),
    )
    return {grid, status: 'playing'}
}

function isWon(grid: Grid): boolean {
    return grid.every(row => row.every(cell => cell.hasMine || cell.revealed))
}

export function reveal(state: MinesweeperState, r: number, c: number): MinesweeperState {
    if (state.status !== 'playing') return state
    const cell = state.grid[r]?.[c]
    if (!cell || cell.revealed || cell.flagged) return state

    const grid = state.grid.map(row => row.map(cell => ({...cell})))

    if (grid[r][c].hasMine) {
        grid[r][c].revealed = true
        return {grid, status: 'lost'}
    }

    // 인접 지뢰가 0개인 칸은 연결된 0-칸 영역 전체를 함께 연다 (flood fill).
    const stack: Array<[number, number]> = [[r, c]]
    while (stack.length > 0) {
        const [cr, cc] = stack.pop()!
        const cur = grid[cr]?.[cc]
        if (!cur || cur.revealed || cur.flagged || cur.hasMine) continue
        cur.revealed = true
        if (cur.adjacentCount === 0) {
            for (const [dr, dc] of NEIGHBOR_OFFSETS) stack.push([cr + dr, cc + dc])
        }
    }

    return {grid, status: isWon(grid) ? 'won' : 'playing'}
}

export function toggleFlag(state: MinesweeperState, r: number, c: number): MinesweeperState {
    if (state.status !== 'playing') return state
    const cell = state.grid[r]?.[c]
    if (!cell || cell.revealed) return state

    const grid = state.grid.map(row => row.map(cell => ({...cell})))
    grid[r][c].flagged = !grid[r][c].flagged
    return {grid, status: state.status}
}

export function placeMines(rows: number, cols: number, mineCount: number, random: () => number = Math.random): boolean[][] {
    const cells: Array<[number, number]> = []
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) cells.push([r, c])
    }
    // Fisher-Yates 셔플 후 앞에서 mineCount개를 지뢰로 지정
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[cells[i], cells[j]] = [cells[j], cells[i]]
    }
    const mines = Array.from({length: rows}, () => Array.from({length: cols}, () => false))
    for (let i = 0; i < Math.min(mineCount, cells.length); i++) {
        const [r, c] = cells[i]
        mines[r][c] = true
    }
    return mines
}
