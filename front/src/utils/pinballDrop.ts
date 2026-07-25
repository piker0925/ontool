export interface PinballStep {
    row: number
    direction: 'left' | 'right'
}

export interface PinballResult {
    path: PinballStep[]
    /** 0 ~ rows 사이의 최종 슬롯 인덱스 (핀에 부딪혀 right로 간 횟수와 동일) */
    finalSlot: number
}

/** mulberry32 — 시드 하나로 결정론적인 [0, 1) 의사난수 시퀀스를 만드는 경량 PRNG. */
function mulberry32(seed: number): () => number {
    let state = seed | 0
    return function next(): number {
        state = (state + 0x6d2b79f5) | 0
        let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/**
 * 갤턴 보드(플린코) 방식으로 구슬을 낙하시킨다. 각 행마다 핀에 부딪혀 좌/우로 50:50 갈라지며,
 * rows번 낙하 후 도착하는 슬롯(0~rows)을 계산한다.
 *
 * seed를 지정하면 항상 같은 경로·결과를 재현한다(테스트·리플레이용). 생략하면 매 호출 무작위 시드를 사용해
 * 실제 추첨처럼 매번 다른 결과가 나온다.
 */
export function simulatePinballDrop(rows: number, seed?: number): PinballResult {
    if (rows < 1) throw new Error('행 수는 1 이상이어야 합니다.')

    const actualSeed = seed ?? Math.floor(Math.random() * 0xffffffff)
    const random = mulberry32(actualSeed)

    const path: PinballStep[] = []
    let finalSlot = 0
    for (let row = 0; row < rows; row++) {
        const goRight = random() < 0.5
        path.push({row, direction: goRight ? 'right' : 'left'})
        if (goRight) finalSlot++
    }

    return {path, finalSlot}
}
