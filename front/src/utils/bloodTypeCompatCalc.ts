export type BloodType = 'A' | 'B' | 'O' | 'AB'

export interface BloodTypeCompatResult {
    score: number
    message: string
}

// 한국에서 통용되는 "혈액형 궁합" 속설 순위표 — 과학적 근거 없는 재미용 콘텐츠.
// [나, 상대] 조합별 점수(0~100)와 짧은 코멘트. 대칭이 아님(속설 자체가 방향성을 가짐).
const BLOOD_TYPE_COMPAT_TABLE: Record<BloodType, Record<BloodType, BloodTypeCompatResult>> = {
    O: {
        O: {score: 75, message: '터놓고 지내는 친구 같은 사이'},
        A: {score: 90, message: '속설 최고 궁합 — 서로를 잘 챙겨줌'},
        B: {score: 70, message: '티격태격해도 은근히 잘 맞음'},
        AB: {score: 60, message: '처음엔 어색해도 갈수록 편해짐'},
    },
    A: {
        O: {score: 85, message: 'A형이 O형에게 잘 맞춰주는 편'},
        A: {score: 80, message: '섬세함이 통하는 편안한 사이'},
        B: {score: 55, message: '성향 차이로 부딪힐 수 있음'},
        AB: {score: 65, message: '적당한 거리감이 오히려 좋음'},
    },
    B: {
        O: {score: 78, message: '자유로운 B형과 털털한 O형, 잘 어울림'},
        A: {score: 58, message: '서로 다른 속도를 맞춰가야 함'},
        B: {score: 72, message: '마이페이스끼리 편하게 지냄'},
        AB: {score: 82, message: '의외로 케미가 좋은 조합'},
    },
    AB: {
        O: {score: 62, message: '신비로운 AB형에게 O형이 다가가는 편'},
        A: {score: 68, message: '차분하게 서로를 이해해가는 사이'},
        B: {score: 84, message: '통통 튀는 매력이 서로 잘 맞음'},
        AB: {score: 88, message: '서로를 가장 잘 이해하는 조합'},
    },
}

/** 혈액형 궁합 속설표 조회 — [나의 혈액형][상대 혈액형] 순서. */
export function getBloodTypeCompat(mine: BloodType, partner: BloodType): BloodTypeCompatResult {
    return BLOOD_TYPE_COMPAT_TABLE[mine][partner]
}

/** 이름 두 개로 결정론적 궁합 점수(0~99)를 만드는 재미용 해시 — 과학적 근거 없음, 같은 입력엔 항상 같은 결과. */
export function calcNameCompatScore(nameA: string, nameB: string): number {
    const combined = [...nameA].map(c => c.codePointAt(0) ?? 0).reduce((a, b) => a + b, 0)
        + [...nameB].map(c => c.codePointAt(0) ?? 0).reduce((a, b) => a + b, 0)
    return combined % 100
}
