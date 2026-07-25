export interface BiorhythmScores {
    physical: number
    emotional: number
    intellectual: number
}

/** 생일 기준 사인파(sine wave) 바이오리듬 — 신체 23일·감성 28일·지성 33일 주기. 재미용 계산, 과학적 근거 없음. */
const PHYSICAL_CYCLE_DAYS = 23
const EMOTIONAL_CYCLE_DAYS = 28
const INTELLECTUAL_CYCLE_DAYS = 33

function sineScore(daysSinceBirth: number, cycleDays: number): number {
    return Math.sin((2 * Math.PI * daysSinceBirth) / cycleDays) * 100
}

/** 출생일로부터 경과한 일수를 받아 세 지표를 -100~100 범위로 계산. */
export function calcBiorhythm(daysSinceBirth: number): BiorhythmScores {
    return {
        physical: sineScore(daysSinceBirth, PHYSICAL_CYCLE_DAYS),
        emotional: sineScore(daysSinceBirth, EMOTIONAL_CYCLE_DAYS),
        intellectual: sineScore(daysSinceBirth, INTELLECTUAL_CYCLE_DAYS),
    }
}
