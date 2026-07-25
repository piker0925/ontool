// 블록 블라스트: 정해진 모양의 블록 3개 중 하나를 골라 그리드에 놓는다. 가로/세로 줄이
// 가득 차면 그 줄이 사라진다. 물리엔진 없이 순수 그리드 상태 관리(배치 가능 여부·줄 클리어
// 판정)만으로 구현한다.
export type Grid = boolean[][]

export interface Piece {
    id: string
    // 각 셀은 블록 모양 안에서의 상대 좌표(행, 열) — (0,0)이 기준점이다.
    cells: Array<[number, number]>
}

// null인 칸은 이번 라운드에 이미 사용된 조각 자리다 — 3칸이 전부 null이 되면 새로 3개를 뽑는다.
export interface BlockBlastState {
    grid: Grid
    pieces: Array<Piece | null>
    score: number
    status: 'playing' | 'over'
}

const GRID_SIZE = 8

// 자주 쓰이는 블록 모양 뱅크 — 1~5칸짜리 조각들로 구성.
export const PIECE_BANK: Piece[] = [
    {id: 'single', cells: [[0, 0]]},
    {id: 'domino-h', cells: [[0, 0], [0, 1]]},
    {id: 'domino-v', cells: [[0, 0], [1, 0]]},
    {id: 'line3-h', cells: [[0, 0], [0, 1], [0, 2]]},
    {id: 'line3-v', cells: [[0, 0], [1, 0], [2, 0]]},
    {id: 'square', cells: [[0, 0], [0, 1], [1, 0], [1, 1]]},
    {id: 'l-shape', cells: [[0, 0], [1, 0], [2, 0], [2, 1]]},
    {id: 'corner', cells: [[0, 0], [0, 1], [1, 0]]},
]

export function createEmptyGrid(size = GRID_SIZE): Grid {
    return Array.from({length: size}, () => Array.from({length: size}, () => false))
}

export function pickPieces(count: number, random: () => number = Math.random): Piece[] {
    return Array.from({length: count}, () => PIECE_BANK[Math.floor(random() * PIECE_BANK.length)])
}

export function createBlockBlastState(random: () => number = Math.random): BlockBlastState {
    return {
        grid: createEmptyGrid(),
        pieces: pickPieces(3, random),
        score: 0,
        status: 'playing',
    }
}

// 조각의 모든 칸이 격자 범위 안이고 비어있어야 배치할 수 있다.
export function canPlace(grid: Grid, piece: Piece, row: number, col: number): boolean {
    const size = grid.length
    return piece.cells.every(([dr, dc]) => {
        const r = row + dr
        const c = col + dc
        if (r < 0 || r >= size || c < 0 || c >= size) return false
        return !grid[r][c]
    })
}

// 배치 불가능하면 같은 참조를 반환해 호출부가 실패를 판별할 수 있게 한다.
export function placePiece(grid: Grid, piece: Piece, row: number, col: number): Grid {
    if (!canPlace(grid, piece, row, col)) return grid
    const next = grid.map(r => [...r])
    piece.cells.forEach(([dr, dc]) => {
        next[row + dr][col + dc] = true
    })
    return next
}

// 가득 찬 행·열을 찾아 전부 비운다. 점수는 "실제로 지워진 칸 수"(distinct)로 계산한다 —
// 한 칸이 가득 찬 행과 열 모두에 속해도(교차점) 한 번만 센다.
export function clearLines(grid: Grid): { grid: Grid; scoreGained: number } {
    const size = grid.length
    const fullRows = new Set<number>()
    const fullCols = new Set<number>()

    for (let r = 0; r < size; r++) {
        if (grid[r].every(cell => cell)) fullRows.add(r)
    }
    for (let c = 0; c < size; c++) {
        if (grid.every(row => row[c])) fullCols.add(c)
    }

    if (fullRows.size === 0 && fullCols.size === 0) return {grid, scoreGained: 0}

    const next = grid.map(row => [...row])
    let scoreGained = 0
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (!fullRows.has(r) && !fullCols.has(c)) continue
            if (next[r][c]) scoreGained++
            next[r][c] = false
        }
    }

    return {grid: next, scoreGained}
}

// 남은 조각 중 하나라도 격자 어딘가에 놓을 수 있으면 아직 게임 오버가 아니다.
export function hasAnyValidMove(grid: Grid, pieces: Array<Piece | null>): boolean {
    const size = grid.length
    return pieces.some(piece => {
        if (!piece) return false
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (canPlace(grid, piece, r, c)) return true
            }
        }
        return false
    })
}

// 트레이의 pieceIndex 조각을 (row, col)에 놓는 한 턴을 처리한다: 배치 → 줄 클리어 → 점수 →
// 조각 소진(3개 다 쓰면 새로 보충) → 다음 턴에 놓을 곳이 없으면 게임 오버까지 한 번에 판정한다.
// 배치 자체가 불가능하면(범위 밖·겹침) 같은 참조를 반환한다.
export function place(state: BlockBlastState, pieceIndex: number, row: number, col: number, random: () => number = Math.random): BlockBlastState {
    if (state.status !== 'playing') return state
    const piece = state.pieces[pieceIndex]
    if (!piece) return state
    if (!canPlace(state.grid, piece, row, col)) return state

    const placedGrid = placePiece(state.grid, piece, row, col)
    const {grid: clearedGrid, scoreGained} = clearLines(placedGrid)

    let pieces = state.pieces.map((p, i) => i === pieceIndex ? null : p)
    if (pieces.every(p => p === null)) pieces = pickPieces(pieces.length, random)

    const status: BlockBlastState['status'] = hasAnyValidMove(clearedGrid, pieces) ? 'playing' : 'over'

    return {
        grid: clearedGrid,
        pieces,
        score: state.score + piece.cells.length + scoreGained,
        status,
    }
}
