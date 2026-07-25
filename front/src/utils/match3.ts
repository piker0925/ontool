// 매치3 퍼즐: 인접한 두 타일을 교환해서 가로/세로로 3개 이상 같은 종류가 모이면 없앤다.
// 없앤 자리는 위에서 새 타일이 내려와 채운다(중력 낙하 + 보충). 매치가 안 되는 교환은 되돌린다.
export type Grid = number[][]

const TILE_TYPES = 5

export function createGrid(size = 8, random: () => number = Math.random): Grid {
    return Array.from({length: size}, () => Array.from({length: size}, () => Math.floor(random() * TILE_TYPES)))
}

// (r,c)에서 시작해 가로·세로 각 방향으로 몇 칸이나 같은 타일이 이어지는지 계산한다.
function runLength(grid: Grid, r: number, c: number, dr: number, dc: number): number {
    const value = grid[r][c]
    let count = 0
    let row = r + dr
    let col = c + dc
    while (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && grid[row][col] === value) {
        count++
        row += dr
        col += dc
    }
    return count
}

// 격자 전체를 훑어 3개 이상 이어진(가로 또는 세로) 타일을 모두 찾는다. 반환값은
// [행, 열] 좌표 목록(중복 없음) — swap 시도 검증과 캐스케이드 처리에서 공용으로 쓴다.
export function findMatches(grid: Grid): Array<[number, number]> {
    const size = grid.length
    const matched = new Set<string>()

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const horizontal = 1 + runLength(grid, r, c, 0, -1) + runLength(grid, r, c, 0, 1)
            if (horizontal >= 3) {
                for (let dc = -runLength(grid, r, c, 0, -1); dc <= runLength(grid, r, c, 0, 1); dc++) {
                    matched.add(`${r},${c + dc}`)
                }
            }
            const vertical = 1 + runLength(grid, r, c, -1, 0) + runLength(grid, r, c, 1, 0)
            if (vertical >= 3) {
                for (let dr = -runLength(grid, r, c, -1, 0); dr <= runLength(grid, r, c, 1, 0); dr++) {
                    matched.add(`${r + dr},${c}`)
                }
            }
        }
    }

    return [...matched].map(key => key.split(',').map(Number) as [number, number])
}

export function isAdjacent(a: [number, number], b: [number, number]): boolean {
    const dr = Math.abs(a[0] - b[0])
    const dc = Math.abs(a[1] - b[1])
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1)
}

function swapCells(grid: Grid, a: [number, number], b: [number, number]): Grid {
    const next = grid.map(row => [...row])
    const tmp = next[a[0]][a[1]]
    next[a[0]][a[1]] = next[b[0]][b[1]]
    next[b[0]][b[1]] = tmp
    return next
}

export interface SwapResult {
    grid: Grid
    matched: boolean
    matches: Array<[number, number]>
}

// 인접하지 않은 두 칸을 교환하려 하면 거절한다. 인접하더라도 매치가 만들어지지 않으면
// 교환을 되돌린다(원래 격자를 그대로 반환) — matched:false로 호출부가 판별할 수 있다.
export function trySwap(grid: Grid, a: [number, number], b: [number, number]): SwapResult {
    if (!isAdjacent(a, b)) return {grid, matched: false, matches: []}

    const swapped = swapCells(grid, a, b)
    const matches = findMatches(swapped)
    if (matches.length === 0) return {grid, matched: false, matches: []}

    return {grid: swapped, matched: true, matches}
}

// 매치된 칸을 지우고, 각 열마다 남은 타일을 아래로 떨어뜨린 뒤 빈 위쪽 칸을 새 타일로
// 채운다. 반환값에 지워진 칸 수(scoreGained)를 포함해 호출부가 점수를 매길 수 있게 한다.
export function clearAndRefill(grid: Grid, matches: Array<[number, number]>, random: () => number = Math.random): { grid: Grid; scoreGained: number } {
    const size = grid.length
    const cleared = grid.map(row => [...row])
    matches.forEach(([r, c]) => {
        cleared[r][c] = -1
    })

    const next: Grid = Array.from({length: size}, () => Array(size).fill(-1))
    for (let c = 0; c < size; c++) {
        const remaining: number[] = []
        for (let r = 0; r < size; r++) {
            if (cleared[r][c] !== -1) remaining.push(cleared[r][c])
        }
        const missing = size - remaining.length
        const newTiles = Array.from({length: missing}, () => Math.floor(random() * TILE_TYPES))
        const column = [...newTiles, ...remaining]
        for (let r = 0; r < size; r++) next[r][c] = column[r]
    }

    return {grid: next, scoreGained: matches.length}
}

// 121 리더보드 연동: match3은 원래 끝이 없는 스코어 어택이었는데, 053의 onGameEnd(제출 1회)
// 모델에 맞으려면 "게임 종료" 시점이 있어야 한다 — 캐주얼 매치3 장르의 흔한 형태인
// "제한된 이동 횟수" 모드를 추가했다(이동 다 쓰면 종료, 점수는 높을수록 좋음).
export interface Match3State {
    grid: Grid
    score: number
    movesLeft: number
    status: 'playing' | 'over'
}

export const INITIAL_MOVES = 20

export function createMatch3State(size = 8, movesLeft = INITIAL_MOVES, random: () => number = Math.random): Match3State {
    return {grid: createGrid(size, random), score: 0, movesLeft, status: 'playing'}
}

// 스왑 한 번을 통째로 처리한다: 매치 안 되면 이동 소모 없이 실패(같은 참조 반환) — 그래야
// "잘못 눌러본" 시도가 제한된 이동 횟수를 갉아먹지 않는다. 매치되면 캐스케이드(클리어→낙하→
// 보충)를 매치가 없어질 때까지 반복해 콤보 점수를 전부 반영한 뒤 이동을 1 소모한다.
export function swap(state: Match3State, a: [number, number], b: [number, number], random: () => number = Math.random): Match3State {
    if (state.status !== 'playing') return state

    const result = trySwap(state.grid, a, b)
    if (!result.matched) return state

    let grid = result.grid
    let matches = result.matches
    let scoreGained = 0
    while (matches.length > 0) {
        const cleared = clearAndRefill(grid, matches, random)
        scoreGained += cleared.scoreGained
        grid = cleared.grid
        matches = findMatches(grid)
    }

    const movesLeft = state.movesLeft - 1
    const status: Match3State['status'] = movesLeft <= 0 ? 'over' : 'playing'

    return {grid, score: state.score + scoreGained, movesLeft, status}
}
