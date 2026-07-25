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

// 길이별 고정 단어 목록 — 오늘 날짜로 결정론적으로 하나를 뽑는다(서버에 "오늘의 단어"를
// 저장하지 않고도 전 세계 모든 플레이어가 같은 날 같은 단어를 받는다 — 리더보드(053)가
// 시도 횟수로 순위를 매기므로, 플레이어마다 난이도가 다른 단어를 받으면 불공정해진다).
export const WORDS_BY_LENGTH: Record<number, string[]> = {
    2: ['사과', '바다', '나무', '구름', '하늘', '거울', '지도', '연필', '우산', '자석'],
    3: ['고양이', '자전거', '무지개', '텔레비', '냉장고', '도서관', '축구공', '이불장', '손목시계', '컴퓨터'],
}

// 날짜(로컬 타임존, YYYY-M-D)를 문자열 해시해 [0,1) 실수로 변환한다. Math.random과 같은
// () => number 모양을 유지해 pickWord/createWordGuessState의 random 파라미터를 그대로 쓸 수
// 있게 하면서도, 값 자체는 달력 날짜에만 의존해 매번 같은 날엔 항상 같은 값이 나온다.
export function seedForDate(date: Date): number {
    const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    let hash = 0
    for (let i = 0; i < dateString.length; i++) {
        hash = (hash * 31 + dateString.charCodeAt(i)) >>> 0
    }
    return (hash % 100000) / 100000
}

// 프로덕션 기본값 — "오늘"을 시드로 쓴다. 테스트는 이 기본값 대신 명시적인 random을
// 주입해(예: `() => seedForDate(new Date(2026, 0, 15))`) 특정 날짜를 고정할 수 있다.
export function todaySeededRandom(): number {
    return seedForDate(new Date())
}

export function pickWord(wordLength: number, random: () => number = todaySeededRandom): string[] {
    const words = WORDS_BY_LENGTH[wordLength] ?? WORDS_BY_LENGTH[2]
    const word = words[Math.floor(random() * words.length)]
    return Array.from(word)
}

export function createWordGuessState(wordLength = 2, maxAttempts = 6, random: () => number = todaySeededRandom): WordGuessState {
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
