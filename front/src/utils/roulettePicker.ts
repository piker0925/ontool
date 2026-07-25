/** 룰렛 항목 중 하나를 무작위로 뽑아 당첨 인덱스를 반환한다. */
export function pickRouletteWinner<T>(items: T[]): number {
    if (items.length === 0) throw new Error('항목이 없습니다.')
    return Math.floor(Math.random() * items.length)
}

/**
 * 당첨 슬라이스의 중심이 포인터(12시 방향, 0deg) 아래에 오도록 휠 회전각(deg)을 계산한다.
 * 슬라이스는 0deg부터 시계방향으로 itemCount등분되어 있다고 가정.
 * extraSpins는 연출용으로 추가되는 완전한 바퀴 수(회전감을 위해 5바퀴 이상 권장).
 */
export function computeSpinRotationDeg(winnerIndex: number, itemCount: number, extraSpins = 5): number {
    if (itemCount <= 0) throw new Error('항목이 없습니다.')
    const sliceDeg = 360 / itemCount
    const centerDeg = winnerIndex * sliceDeg + sliceDeg / 2
    const baseRotation = (360 - centerDeg) % 360
    return baseRotation + extraSpins * 360
}
