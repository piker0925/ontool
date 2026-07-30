// Tetris 2D Vector Canvas Game Engine
// SRS (Standard Rotation System), 7-Bag Randomizer, Ghost Piece, Line Clear, Garbage Line Multi Attack Support.

export const BOARD_COLS = 10
export const BOARD_ROWS = 20

export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'

export interface Piece {
    type: TetrominoType
    shape: number[][]
    colorIndex: number
    x: number
    y: number
    rotation: number // 0: 0, 1: 90, 2: 180, 3: 270
}

export type TetrisStatus = 'ready' | 'playing' | 'over'

export interface TetrisState {
    grid: number[][] // 0 = empty, 1~7 = colorIndex
    currentPiece: Piece | null
    nextPiece: Piece | null
    bag: TetrominoType[]
    score: number
    linesCleared: number
    level: number
    status: TetrisStatus
    elapsedMs: number
    dropRemainingMs: number
}

// 7종 미노 형상 및 색상 인덱스 (1~7)
export const TETROMINOES: Record<TetrominoType, { shape: number[][]; colorIndex: number }> = {
    I: {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        colorIndex: 1 // Blue/Cyan
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        colorIndex: 2 // Blue
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        colorIndex: 3 // Orange/Yellow
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        colorIndex: 4 // Yellow
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        colorIndex: 5 // Green
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        colorIndex: 6 // Purple
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        colorIndex: 7 // Red/Pink
    }
}

const ALL_TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']

function shuffleBag(random: () => number = Math.random): TetrominoType[] {
    const bag = [...ALL_TYPES]
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]]
    }
    return bag
}

function spawnPiece(type: TetrominoType): Piece {
    const info = TETROMINOES[type]
    const size = info.shape.length
    const x = Math.floor((BOARD_COLS - size) / 2)
    return {
        type,
        shape: info.shape,
        colorIndex: info.colorIndex,
        x,
        y: 0,
        rotation: 0
    }
}

export function createEmptyGrid(): number[][] {
    return Array.from({length: BOARD_ROWS}, () => Array(BOARD_COLS).fill(0))
}

export function createTetrisState(random: () => number = Math.random, initialStatus: TetrisStatus = 'ready'): TetrisState {
    let bag = shuffleBag(random)
    const currentType = bag.pop()!
    if (bag.length === 0) bag = shuffleBag(random)
    const nextType = bag.pop()!

    const currentPiece = spawnPiece(currentType)
    const nextPiece = spawnPiece(nextType)

    return {
        grid: createEmptyGrid(),
        currentPiece,
        nextPiece,
        bag,
        score: 0,
        linesCleared: 0,
        level: 1,
        status: initialStatus,
        elapsedMs: 0,
        dropRemainingMs: 800
    }
}

export function startTetrisGame(state: TetrisState): TetrisState {
    return {
        ...state,
        status: 'playing',
    }
}

function isColliding(grid: number[][], piece: Piece, offsetX = 0, offsetY = 0, testShape = piece.shape): boolean {
    for (let r = 0; r < testShape.length; r++) {
        for (let c = 0; c < testShape[r].length; c++) {
            if (testShape[r][c] !== 0) {
                const targetX = piece.x + c + offsetX
                const targetY = piece.y + r + offsetY

                if (targetX < 0 || targetX >= BOARD_COLS || targetY >= BOARD_ROWS) {
                    return true
                }
                if (targetY >= 0 && grid[targetY][targetX] !== 0) {
                    return true
                }
            }
        }
    }
    return false
}

export function moveLeft(state: TetrisState): TetrisState {
    if (state.status !== 'playing' || !state.currentPiece) return state
    if (!isColliding(state.grid, state.currentPiece, -1, 0)) {
        return {
            ...state,
            currentPiece: {...state.currentPiece, x: state.currentPiece.x - 1}
        }
    }
    return state
}

export function moveRight(state: TetrisState): TetrisState {
    if (state.status !== 'playing' || !state.currentPiece) return state
    if (!isColliding(state.grid, state.currentPiece, 1, 0)) {
        return {
            ...state,
            currentPiece: {...state.currentPiece, x: state.currentPiece.x + 1}
        }
    }
    return state
}

function rotateMatrixClockwise(matrix: number[][]): number[][] {
    const n = matrix.length
    const result = Array.from({length: n}, () => Array(n).fill(0))
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            result[c][n - 1 - r] = matrix[r][c]
        }
    }
    return result
}

export function rotatePiece(state: TetrisState): TetrisState {
    if (state.status !== 'playing' || !state.currentPiece) return state
    const p = state.currentPiece
    if (p.type === 'O') return state

    const rotatedShape = rotateMatrixClockwise(p.shape)

    // SRS Wall kick offsets (expanded for smooth wall hugging rotation)
    const offsets = [
        [0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1], [0, 1], [-1, 1], [1, 1]
    ]

    for (const [dx, dy] of offsets) {
        if (!isColliding(state.grid, p, dx, dy, rotatedShape)) {
            return {
                ...state,
                currentPiece: {
                    ...p,
                    shape: rotatedShape,
                    x: p.x + dx,
                    y: p.y + dy,
                    rotation: (p.rotation + 1) % 4
                }
            }
        }
    }
    return state
}

export function getGhostY(state: TetrisState): number {
    if (!state.currentPiece) return 0
    let ghostY = state.currentPiece.y
    while (!isColliding(state.grid, state.currentPiece, 0, ghostY - state.currentPiece.y + 1)) {
        ghostY++
    }
    return ghostY
}

export function getDropDelayForLevel(level: number): number {
    return Math.max(60, 750 - (level - 1) * 80)
}

function lockPieceAndClearLines(state: TetrisState, random: () => number = Math.random): { nextState: TetrisState; clearedCount: number } {
    if (!state.currentPiece) return { nextState: state, clearedCount: 0 }

    const newGrid = state.grid.map(row => [...row])
    const p = state.currentPiece

    for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
            if (p.shape[r][c] !== 0) {
                const targetY = p.y + r
                const targetX = p.x + c
                if (targetY >= 0 && targetY < BOARD_ROWS && targetX >= 0 && targetX < BOARD_COLS) {
                    newGrid[targetY][targetX] = p.colorIndex
                }
            }
        }
    }

    // Line clearing
    let clearedCount = 0
    const remainingRows = newGrid.filter(row => {
        const full = row.every(cell => cell !== 0)
        if (full) clearedCount++
        return !full
    })

    while (remainingRows.length < BOARD_ROWS) {
        remainingRows.unshift(Array(BOARD_COLS).fill(0))
    }

    const addedScore = [0, 100, 300, 500, 800][clearedCount] || 0
    const totalCleared = state.linesCleared + clearedCount
    const newLevel = Math.floor(totalCleared / 5) + 1

    // Spawn next piece
    let bag = [...state.bag]
    if (bag.length === 0) bag = shuffleBag(random)
    const nextType = bag.pop()!
    if (bag.length === 0) bag = shuffleBag(random)

    const spawned = state.nextPiece!
    const upcoming = spawnPiece(nextType)

    const over = isColliding(remainingRows, spawned)

    return {
        clearedCount,
        nextState: {
            ...state,
            grid: remainingRows,
            currentPiece: spawned,
            nextPiece: upcoming,
            bag,
            score: state.score + addedScore,
            linesCleared: totalCleared,
            level: newLevel,
            status: over ? 'over' : 'playing',
            dropRemainingMs: getDropDelayForLevel(newLevel)
        }
    }
}

export function hardDrop(state: TetrisState, random: () => number = Math.random): TetrisState {
    if (state.status !== 'playing' || !state.currentPiece) return state
    const ghostY = getGhostY(state)
    const droppedPiece = {...state.currentPiece, y: ghostY}
    const tempState = {...state, currentPiece: droppedPiece}
    const {nextState} = lockPieceAndClearLines(tempState, random)
    return {...nextState, score: nextState.score + (ghostY - state.currentPiece.y) * 2}
}

export function softDrop(state: TetrisState, random: () => number = Math.random): TetrisState {
    if (state.status !== 'playing' || !state.currentPiece) return state
    if (!isColliding(state.grid, state.currentPiece, 0, 1)) {
        return {
            ...state,
            currentPiece: {...state.currentPiece, y: state.currentPiece.y + 1},
            score: state.score + 1
        }
    }
    const {nextState} = lockPieceAndClearLines(state, random)
    return nextState
}

export function tickTetris(state: TetrisState, deltaMs: number, random: () => number = Math.random): { nextState: TetrisState; clearedCount: number } {
    if (state.status !== 'playing') return { nextState: state, clearedCount: 0 }

    const elapsedMs = state.elapsedMs + deltaMs
    let dropRemainingMs = state.dropRemainingMs - deltaMs

    if (dropRemainingMs <= 0) {
        if (!isColliding(state.grid, state.currentPiece!, 0, 1)) {
            return {
                clearedCount: 0,
                nextState: {
                    ...state,
                    elapsedMs,
                    currentPiece: {...state.currentPiece!, y: state.currentPiece!.y + 1},
                    dropRemainingMs: getDropDelayForLevel(state.level)
                }
            }
        } else {
            const {nextState, clearedCount} = lockPieceAndClearLines(state, random)
            return {
                clearedCount,
                nextState: {
                    ...nextState,
                    elapsedMs
                }
            }
        }
    }

    return {
        clearedCount: 0,
        nextState: {
            ...state,
            elapsedMs,
            dropRemainingMs
        }
    }
}

export function addGarbageLines(state: TetrisState, lineCount: number, gapColIndex: number = Math.floor(Math.random() * BOARD_COLS)): TetrisState {
    if (state.status !== 'playing' || lineCount <= 0) return state

    const newGrid = state.grid.slice(lineCount)
    for (let i = 0; i < lineCount; i++) {
        const row = Array(BOARD_COLS).fill(8) // 8 = garbage color
        row[gapColIndex] = 0
        newGrid.push(row)
    }

    return {
        ...state,
        grid: newGrid
    }
}
