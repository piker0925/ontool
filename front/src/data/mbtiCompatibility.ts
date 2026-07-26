import {MBTI_TYPE_INFO, MBTI_TYPES, type MbtiCompatibilityCategory} from './mbtiTypes'

export interface MbtiCompatibilityEntry {
    score: number
    description: string
}

export type MbtiCompatibilityRow = Record<MbtiCompatibilityCategory, MbtiCompatibilityEntry>

const CATEGORIES: readonly MbtiCompatibilityCategory[] = ['romance', 'friendship', 'work']

const BASE_SCORE = 50

/**
 * 축(EI/SN/TF/JP)별로 "같으면"/"다르면" 각각 몇 점을 더할지 정의.
 * 실제 심리학적 근거가 아니라 밈 콘텐츠용 규칙 — 궁합 랭킹에 극단값(최고/최악)이 나오도록
 * 분류별로 어느 축이 중요한지 다르게 가중치를 줬다.
 * 순서는 MBTI 문자열 인덱스와 동일: [EI, SN, TF, JP]
 */
const AXIS_WEIGHTS: Record<MbtiCompatibilityCategory, { match: number; mismatch: number }[]> = {
    romance: [
        {match: 4, mismatch: 8}, // EI: 약간의 균형 정도, 결정적이진 않음
        {match: 20, mismatch: -20}, // SN: 세상 보는 방식이 다르면 연애에서 크게 어긋남
        {match: -6, mismatch: 14}, // TF: 서로 다른 게 매력 포인트(반대가 끌린다)
        {match: -4, mismatch: 10}, // JP: 즉흥 + 계획 조합이 콩닥거림
    ],
    friendship: [
        {match: 6, mismatch: 2},
        {match: 16, mismatch: -10}, // SN: 관심사·화제가 맞아야 죽이 잘 맞음
        {match: 8, mismatch: -2},
        {match: -2, mismatch: 12}, // JP: 계획파 + 즉흥파 조합이 놀 때 재밌음
    ],
    work: [
        {match: 5, mismatch: 3},
        {match: 8, mismatch: -6},
        {match: -4, mismatch: 14}, // TF: 논리와 공감이 나뉘어야 업무 분담이 됨
        {match: 18, mismatch: -16}, // JP: 업무 스타일 차이가 가장 큰 마찰 요인
    ],
}

type Bucket = 'best' | 'good' | 'mid' | 'low' | 'worst'

function bucketOf(score: number): Bucket {
    if (score >= 85) return 'best'
    if (score >= 70) return 'good'
    if (score >= 50) return 'mid'
    if (score >= 30) return 'low'
    return 'worst'
}

const TEMPLATES: Record<MbtiCompatibilityCategory, Record<Bucket, string[]>> = {
    romance: {
        best: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 만나자마자 "이 사람이다" 느낌이 오는 천생연분 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 연애 세포가 미친듯이 활성화되는 케미, 주변에서 부러워할 정도.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 싸울 일보다 마주 보고 웃을 일이 압도적으로 많은 사이다.',
        ],
        good: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 티키타카가 잘 맞아서 만날수록 편해지는 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 다른 매력에 자꾸 끌리는, 은근히 잘 통하는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 초반 어색함만 넘기면 오래갈 확률이 높은 편이다.',
        ],
        mid: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 좋을 땐 정말 좋지만 페이스 조절이 관건인 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 노력하면 충분히 잘 될 수 있는, 케이스 바이 케이스 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 설렘은 있지만 가치관 차이로 가끔 부딪힐 수 있는 사이다.',
        ],
        low: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 다른 속도로 사랑을 표현해서 오해가 쌓이기 쉬운 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 끌리긴 하는데 대화만 하면 자꾸 평행선을 걷는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 노력 없이는 삐걱대기 쉬운, 밀당의 밀당이 필요한 궁합이다.',
        ],
        worst: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 사랑보다 인내심 테스트에 가까운 궁합일 수 있다(그래도 반전 매력은 있음).',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 다름이 매력일 수도 있지만, 이 조합은 다름이 다툼이 되기 쉬운 편이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로의 우주가 너무 달라서 만나면 통역기가 필요할지도 모른다.',
        ],
    },
    friendship: {
        best: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 만난 지 하루 만에 10년지기 같은, 우정 만렙 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 싸워도 하루 안 가는, 편하고 든든한 단짝 후보다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 취향까지 비슷해서 뭘 해도 죽이 잘 맞는 친구 사이다.',
        ],
        good: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같이 있으면 시간 가는 줄 모르는, 꽤 잘 맞는 친구 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 가끔 티격태격해도 결국 또 붙어다니는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 관심사는 달라도 대화는 끊이지 않는 편한 조합이다.',
        ],
        mid: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 친해지는 데 시간이 좀 걸리지만 한번 친해지면 오래가는 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 노는 스타일은 달라도 은근히 챙겨주는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 자주 안 봐도 만나면 반가운, 느슨하지만 꾸준한 우정이다.',
        ],
        low: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 텐션이 안 맞아서 약속 잡기부터 피곤한 궁합일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같이 놀면 재밌긴 한데 자꾸 의견이 갈리는 편이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 친구보다는 아는 사람에 가까워지기 쉬운 조합이다.',
        ],
        worst: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 한 명은 계획 짜고 한 명은 다 취소하는, 몸이 힘든 우정일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같이 있으면 은근히 진 빠지는, 케미보다 인내가 필요한 사이다(그래도 은근 재밌을 때도 있음).',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 취향도 텐션도 정반대라 단체 톡방에서만 만나는 우정이 되기 쉽다.',
        ],
    },
    work: {
        best: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 업무 궁합 만렙, 프로젝트 하나 맡기면 알아서 척척 굴러가는 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 역할 분담이 자연스럽게 되는, 사수-부사수로 만나도 성공할 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 회의 한 번이면 서로 뭘 원하는지 눈빛으로 통하는 사이다.',
        ],
        good: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 부족한 부분을 채워주는, 협업하면 시너지가 나는 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 스타일은 달라도 결과물은 확실하게 뽑아내는 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 초반 합만 맞추면 믿고 맡길 수 있는 편한 파트너십이다.',
        ],
        mid: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같이 일하면 나쁘진 않은데 서로 페이스를 맞추는 데 시간이 필요한 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 역할이 명확하게 나뉘어 있을 때 제일 잘 굴러가는 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 보고 방식만 맞추면 무난하게 흘러가는 업무 궁합이다.',
        ],
        low: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 일하는 속도와 방식이 달라서 은근히 마찰이 잦은 궁합일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같은 팀이면 회의 시간이 자꾸 길어지는 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 결과보다 과정에서 자꾸 부딪히는, 조율이 필수인 사이다.',
        ],
        worst: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 한 명은 계획서부터 쓰고 한 명은 일단 시작하는, 업무 스타일이 정반대인 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같은 팀이 되면 메신저 알림이 폭발할 수 있는 조합이다(그래도 결과는 의외로 나올 때도 있음).',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 일 얘기만 하면 텐션이 갈리는, 서로 존중이 필요한 파트너십이다.',
        ],
    },
}

/** 문자열을 결정적인(비-암호학적) 정수 해시로 변환. Math.random 대신 재현 가능한 "다양성"을 만드는 데 쓴다. */
function hashString(input: string): number {
    let h = 0
    for (let i = 0; i < input.length; i++) {
        h = (h * 31 + input.charCodeAt(i)) >>> 0
    }
    return h
}

function clampScore(n: number): number {
    return Math.max(5, Math.min(99, Math.round(n)))
}

function computeScore(a: string, b: string, category: MbtiCompatibilityCategory): number {
    const weights = AXIS_WEIGHTS[category]
    let total = BASE_SCORE
    for (let axis = 0; axis < 4; axis++) {
        const same = a[axis] === b[axis]
        total += same ? weights[axis].match : weights[axis].mismatch
    }
    const noiseKey = [a, b].sort().join('-') + ':' + category
    const noise = (hashString(noiseKey) % 11) - 5 // -5..+5, pair 순서와 무관(대칭)
    return clampScore(total + noise)
}

function fillTemplate(template: string, a: string, b: string, category: MbtiCompatibilityCategory): string {
    const infoA = MBTI_TYPE_INFO[a]
    const infoB = MBTI_TYPE_INFO[b]
    return template
        .replaceAll('{aNick}', infoA.nickname)
        .replaceAll('{aTrait}', infoA.traits[category])
        .replaceAll('{bNick}', infoB.nickname)
        .replaceAll('{bTrait}', infoB.traits[category])
}

function describe(a: string, b: string, category: MbtiCompatibilityCategory, score: number): string {
    const bucket = bucketOf(score)
    const variants = TEMPLATES[category][bucket]
    const variantIndex = hashString(a + b + category) % variants.length
    return fillTemplate(variants[variantIndex], a, b, category)
}

function buildRow(a: string, b: string): MbtiCompatibilityRow {
    const row = {} as MbtiCompatibilityRow
    for (const category of CATEGORIES) {
        const score = computeScore(a, b, category)
        row[category] = {score, description: describe(a, b, category, score)}
    }
    return row
}

function pairKey(a: string, b: string): string {
    return `${a}-${b}`
}

/** 16×16 = 256가지 조합(자기 자신 포함) 전체를 담은 궁합 매트릭스. */
export const MBTI_COMPATIBILITY: Record<string, MbtiCompatibilityRow> = (() => {
    const matrix: Record<string, MbtiCompatibilityRow> = {}
    for (const a of MBTI_TYPES) {
        for (const b of MBTI_TYPES) {
            matrix[pairKey(a, b)] = buildRow(a, b)
        }
    }
    return matrix
})()

export function getCompatibility(a: string, b: string, category: MbtiCompatibilityCategory): MbtiCompatibilityEntry {
    const row = MBTI_COMPATIBILITY[pairKey(a, b)]
    if (!row) throw new Error(`알 수 없는 MBTI 조합: ${a}-${b}`)
    return row[category]
}

export {CATEGORIES as MBTI_COMPATIBILITY_CATEGORIES}
