// 한국어 단어 맞추기(워들류): 정해진 글자 수의 단어를 여러 번 시도해 맞춘다.
// 한글 자모 분해 없이 음절(글자) 단위로 비교한다 — "사과"를 ['사','과']로 다뤄
// 각 자리의 정답 일치(초록) / 다른 자리에 존재(노랑) / 없음(회색)을 판정한다.
export type LetterResult = 'correct' | 'present' | 'absent'

export interface GuessRow {
    letters: string[]
    results: LetterResult[]
}

export interface WordGuessState {
    answer: string[]
    wordLength: number
    maxAttempts: number
    rows: GuessRow[]
    status: 'playing' | 'won' | 'lost'
}

// 길이별 고정 단어 목록 — 매판 injectable random으로 하나를 뽑는다(매일 고정 단어 서버 관리는
// 이번 이슈 범위 밖, 이슈 본문 참고).
export const WORDS_BY_LENGTH: Record<number, string[]> = {
    2: ['사과', '바다', '나무', '구름', '하늘', '거울', '지도', '연필', '우산', '자석'],
    3: ['고양이', '자전거', '무지개', '텔레비', '냉장고', '도서관', '축구공', '이불장', '손목시계', '컴퓨터'],
}

export function pickWord(wordLength: number, random: () => number = Math.random): string[] {
    const words = WORDS_BY_LENGTH[wordLength] ?? WORDS_BY_LENGTH[2]
    const word = words[Math.floor(random() * words.length)]
    return Array.from(word)
}

export function createWordGuessState(wordLength = 2, maxAttempts = 6, random: () => number = Math.random): WordGuessState {
    return {
        answer: pickWord(wordLength, random),
        wordLength,
        maxAttempts,
        rows: [],
        status: 'playing',
    }
}

// Wordle 표준 알고리즘: 먼저 정확히 일치하는 자리를 correct로 확정하고, 남은 정답 글자
// 풀에서 하나씩 소모해가며 present를 판정한다 — 그래야 정답에 같은 글자가 1개뿐인데
// 추측에 2개 있는 경우 두 번째 것까지 present로 잘못 표시되지 않는다.
export function judgeGuess(answer: string[], guess: string[]): LetterResult[] {
    const results: LetterResult[] = new Array(guess.length).fill('absent')
    const remaining = [...answer]

    guess.forEach((letter, i) => {
        if (answer[i] === letter) {
            results[i] = 'correct'
            remaining[remaining.indexOf(letter)] = ''
        }
    })

    guess.forEach((letter, i) => {
        if (results[i] === 'correct') return
        const idx = remaining.indexOf(letter)
        if (idx !== -1) {
            results[i] = 'present'
            remaining[idx] = ''
        }
    })

    return results
}

export function isWin(results: LetterResult[]): boolean {
    return results.every(r => r === 'correct')
}

// 글자 수가 맞지 않는 추측은 거절한다(호출부가 null로 "제출 불가"를 판별).
export function submitGuess(state: WordGuessState, guess: string[]): WordGuessState {
    if (state.status !== 'playing') return state
    if (guess.length !== state.wordLength) return state

    const results = judgeGuess(state.answer, guess)
    const rows = [...state.rows, {letters: guess, results}]
    const won = isWin(results)
    const status: WordGuessState['status'] = won ? 'won' : (rows.length >= state.maxAttempts ? 'lost' : 'playing')

    return {...state, rows, status}
}
