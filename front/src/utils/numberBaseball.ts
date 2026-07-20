export interface GuessResult {
    strikes: number
    balls: number
    isOut: boolean
}

export function generateSecret(length: number, random: () => number = Math.random): number[] {
    const digits = Array.from({length: 10}, (_, i) => i)
    for (let i = digits.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[digits[i], digits[j]] = [digits[j], digits[i]]
    }
    const secret = digits.slice(0, length)
    // 첫 자리가 0이면 0이 아닌 뒷자리와 맞바꿔 앞자리 0을 피한다.
    if (secret[0] === 0) {
        const swapIndex = secret.findIndex(d => d !== 0)
        if (swapIndex > 0) [secret[0], secret[swapIndex]] = [secret[swapIndex], secret[0]]
    }
    return secret
}

export function judgeGuess(secret: number[], guess: number[]): GuessResult {
    let strikes = 0
    let balls = 0
    for (let i = 0; i < secret.length; i++) {
        if (guess[i] === secret[i]) strikes++
        else if (secret.includes(guess[i])) balls++
    }
    return {strikes, balls, isOut: strikes === 0 && balls === 0}
}

export function isWin(result: GuessResult, length: number): boolean {
    return result.strikes === length
}
