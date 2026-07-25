/** 참가자 전원의 순서를 무작위로 한 번에 결정한다 (Fisher-Yates, 원본 배열은 변형하지 않음). */
export function generateRandomOrder<T>(items: T[]): T[] {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}
