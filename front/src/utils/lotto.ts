/** 로또 번호 6개를 1~45 범위에서 중복 없이 무작위 생성한다. */
export function generateLottoNumbers(): number[] {
    const pool = Array.from({length: 45}, (_, i) => i + 1)
    const result: number[] = []
    for (let i = 0; i < 6; i++) {
        const idx = Math.floor(Math.random() * pool.length)
        result.push(pool[idx])
        pool.splice(idx, 1)
    }
    return result.sort((a, b) => a - b)
}
