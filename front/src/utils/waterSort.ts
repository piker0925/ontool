// 워터소트 퍼즐: 시험관(스택)에 섞인 색깔을 같은 색끼리 모아 분리한다. 각 시험관은
// 배열의 마지막 원소가 "맨 위"다. 위에서부터 연속된 같은 색 구간만 한 번에 옮길 수 있고,
// 옮기는 곳은 비어있거나 맨 위 색이 같아야 하며, 그 칸에 다 담을 수 있어야 한다.
export type Tube = string[]
export type Tubes = Tube[]

export const TUBE_CAPACITY = 4

// colorCount개의 색을 각각 정확히 TUBE_CAPACITY개씩 채운 시험관들을 무작위로 섞어서 만들고,
// 마지막에 emptyTubes개의 빈 시험관을 추가한다(항상 최소 1개 이상 필요 — 옮길 공간이 없으면
// 애초에 풀 수 없다).
export function createPuzzle(colorCount: number, emptyTubes = 2, random: () => number = Math.random): Tubes {
    const colors = Array.from({length: colorCount}, (_, i) => `c${i}`)
    const pool: string[] = []
    colors.forEach(color => {
        for (let i = 0; i < TUBE_CAPACITY; i++) pool.push(color)
    })

    // Fisher-Yates 셔플
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }

    const tubes: Tubes = []
    for (let i = 0; i < colorCount; i++) {
        tubes.push(pool.slice(i * TUBE_CAPACITY, (i + 1) * TUBE_CAPACITY))
    }
    for (let i = 0; i < emptyTubes; i++) tubes.push([])

    return tubes
}

// 맨 위에서부터 연속으로 같은 색인 구간의 길이(1 이상, 빈 시험관이면 0).
function topRunLength(tube: Tube): number {
    if (tube.length === 0) return 0
    const color = tube[tube.length - 1]
    let count = 0
    for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) count++
    return count
}

export function canPour(tubes: Tubes, from: number, to: number): boolean {
    if (from === to) return false
    const fromTube = tubes[from]
    const toTube = tubes[to]
    if (fromTube.length === 0) return false
    if (toTube.length >= TUBE_CAPACITY) return false
    if (toTube.length > 0 && toTube[toTube.length - 1] !== fromTube[fromTube.length - 1]) return false

    const runLength = topRunLength(fromTube)
    const space = TUBE_CAPACITY - toTube.length
    return Math.min(runLength, space) > 0
}

// 이동 불가능하면 같은 참조를 반환한다(호출부가 실패를 판별할 수 있게).
export function pour(tubes: Tubes, from: number, to: number): Tubes {
    if (!canPour(tubes, from, to)) return tubes

    const next = tubes.map(t => [...t])
    const fromTube = next[from]
    const toTube = next[to]
    const color = fromTube[fromTube.length - 1]
    const runLength = topRunLength(fromTube)
    const space = TUBE_CAPACITY - toTube.length
    const moveCount = Math.min(runLength, space)

    for (let i = 0; i < moveCount; i++) {
        fromTube.pop()
        toTube.push(color)
    }

    return next
}

// 모든 시험관이 비어있거나(단색으로만 가득 차 있거나) 완성 상태여야 승리다.
export function isSolved(tubes: Tubes): boolean {
    return tubes.every(tube => {
        if (tube.length === 0) return true
        if (tube.length !== TUBE_CAPACITY) return false
        return tube.every(c => c === tube[0])
    })
}
