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
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 케미가 아이돌 무대급으로 딱딱 맞아떨어지는, 보는 사람도 설레는 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 말 안 해도 통하는, 연애 고수끼리 만난 완벽한 시너지다.',
        ],
        good: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 티키타카가 잘 맞아서 만날수록 편해지는 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 다른 매력에 자꾸 끌리는, 은근히 잘 통하는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 초반 어색함만 넘기면 오래갈 확률이 높은 편이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 밀당 없이도 자연스럽게 가까워지는, 무난하게 좋은 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 케미는 확실한데 타이밍만 잘 맞추면 되는 사이다.',
        ],
        mid: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 좋을 땐 정말 좋지만 페이스 조절이 관건인 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 노력하면 충분히 잘 될 수 있는, 케이스 바이 케이스 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 설렘은 있지만 가치관 차이로 가끔 부딪힐 수 있는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 밀당이 좀 필요하지만 그만큼 짜릿할 수 있는 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 만나봐야 아는, 궁합이 애매하게 갈리는 유형이다.',
        ],
        low: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 다른 속도로 사랑을 표현해서 오해가 쌓이기 쉬운 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 끌리긴 하는데 대화만 하면 자꾸 평행선을 걷는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 노력 없이는 삐걱대기 쉬운, 밀당의 밀당이 필요한 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 설렘은 잠깐이고 현실 자각 타임이 자주 오는 궁합일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 좋아하는 포인트가 달라서 자꾸 엇갈리는 편이다.',
        ],
        worst: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 사랑보다 인내심 테스트에 가까운 궁합일 수 있다(그래도 반전 매력은 있음).',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 다름이 매력일 수도 있지만, 이 조합은 다름이 다툼이 되기 쉬운 편이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로의 우주가 너무 달라서 만나면 통역기가 필요할지도 모른다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 케미보다 텔레파시가 필요한, 대화가 자꾸 겉도는 궁합일 수 있다(그래도 의외의 반전은 있음).',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 썸도 타기 전에 서로 지칠 수 있는, 궁합보다 인연이 필요한 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 좋아하는 방식이 정반대라 마음을 알아채는 데 시간이 오래 걸리는 궁합일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 콩깍지가 씌기도 전에 현실 문제부터 부딪히기 쉬운 조합이다(그래도 인연이면 어떻게든 이어짐).',
        ],
    },
    friendship: {
        best: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 만난 지 하루 만에 10년지기 같은, 우정 만렙 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 싸워도 하루 안 가는, 편하고 든든한 단짝 후보다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 취향까지 비슷해서 뭘 해도 죽이 잘 맞는 친구 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 말 안 해도 눈빛으로 통하는, 우정 드라마 주인공급 케미다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같이 있으면 늘 웃음이 끊이지 않는, 최애 친구 후보 1순위다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 놀리면서도 제일 먼저 챙기는, 티키타카 만렙 우정이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 뭘 해도 합이 척척 맞는, 인생 친구 각인 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 처음 봐도 오래된 친구 같은, 편안함이 남다른 우정이다.',
        ],
        good: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같이 있으면 시간 가는 줄 모르는, 꽤 잘 맞는 친구 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 가끔 티격태격해도 결국 또 붙어다니는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 관심사는 달라도 대화는 끊이지 않는 편한 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 함께 있으면 편안한, 무난하게 오래 갈 우정이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 취미는 안 겹쳐도 은근히 코드가 잘 맞는 사이다.',
        ],
        mid: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 친해지는 데 시간이 좀 걸리지만 한번 친해지면 오래가는 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 노는 스타일은 달라도 은근히 챙겨주는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 자주 안 봐도 만나면 반가운, 느슨하지만 꾸준한 우정이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 먼저 다가가는 쪽이 있어야 가까워지는, 느린 템포의 우정이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 합이 확 맞진 않아도 나쁘지 않은, 은근히 편한 조합이다.',
        ],
        low: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 텐션이 안 맞아서 약속 잡기부터 피곤한 궁합일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같이 놀면 재밌긴 한데 자꾸 의견이 갈리는 편이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 친구보다는 아는 사람에 가까워지기 쉬운 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 만나면 재밌는데 연락은 뜸해지기 쉬운 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 관심사가 갈려서 대화 주제 찾기부터 숙제인 조합일 수 있다.',
        ],
        worst: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 한 명은 계획 짜고 한 명은 다 취소하는, 몸이 힘든 우정일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같이 있으면 은근히 진 빠지는, 케미보다 인내가 필요한 사이다(그래도 은근 재밌을 때도 있음).',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 취향도 텐션도 정반대라 단체 톡방에서만 만나는 우정이 되기 쉽다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 한 명은 집콕파, 한 명은 인싸파라 약속 자체가 미스터리인 우정일 수 있다(그래도 가끔은 죽이 잘 맞을 때도 있음).',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 리듬이 안 맞아서 단체 모임에서만 겨우 마주치는 사이가 되기 쉽다.',
        ],
    },
    work: {
        best: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 업무 궁합 만렙, 프로젝트 하나 맡기면 알아서 척척 굴러가는 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 역할 분담이 자연스럽게 되는, 사수-부사수로 만나도 성공할 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 회의 한 번이면 서로 뭘 원하는지 눈빛으로 통하는 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 각자 강점이 딱 맞아떨어져서 프로젝트가 술술 풀리는 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 따로 조율 안 해도 결과물이 착착 맞아떨어지는 환상의 팀이다.',
        ],
        good: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 서로 부족한 부분을 채워주는, 협업하면 시너지가 나는 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 스타일은 달라도 결과물은 확실하게 뽑아내는 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 초반 합만 맞추면 믿고 맡길 수 있는 편한 파트너십이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 스타일 차이는 있어도 마감은 확실히 지키는 든든한 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 역할만 잘 나누면 꽤 시너지 나는 파트너십이다.',
        ],
        mid: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같이 일하면 나쁘진 않은데 서로 페이스를 맞추는 데 시간이 필요한 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 역할이 명확하게 나뉘어 있을 때 제일 잘 굴러가는 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 보고 방식만 맞추면 무난하게 흘러가는 업무 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 합을 맞추는 데 약간의 적응 기간이 필요한 무난한 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 잘 맞을 때도 안 맞을 때도 있는, 케이스 바이 케이스 업무 궁합이다.',
        ],
        low: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 일하는 속도와 방식이 달라서 은근히 마찰이 잦은 궁합일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같은 팀이면 회의 시간이 자꾸 길어지는 조합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 결과보다 과정에서 자꾸 부딪히는, 조율이 필수인 사이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 체크인 주기부터 안 맞아서 진행 상황 공유가 피곤한 조합일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 우선순위가 자꾸 달라서 협업할 때 조율이 많이 필요한 편이다.',
        ],
        worst: [
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 한 명은 계획서부터 쓰고 한 명은 일단 시작하는, 업무 스타일이 정반대인 궁합이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 같은 팀이 되면 메신저 알림이 폭발할 수 있는 조합이다(그래도 결과는 의외로 나올 때도 있음).',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 일 얘기만 하면 텐션이 갈리는, 서로 존중이 필요한 파트너십이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 보고 방식부터 정반대라 협업 첫 주가 가장 고비인 조합일 수 있다(그래도 자리 잡으면 의외로 굴러가기도 함).',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 회의 때마다 결이 달라서 결론 내리는 데 유독 오래 걸리는 파트너십이다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 일 처리 순서부터 안 맞아서 같은 업무도 두 배로 오래 걸리는 조합일 수 있다.',
            '"{aTrait}"인 {aNick}와 "{bTrait}"인 {bNick}는 피드백 주고받는 온도차가 커서 협업이 유독 조심스러운 파트너십이다(그래도 손발은 의외로 맞을 때도 있음).',
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

/**
 * 두 유형·분류에 대해 어떤 원본 템플릿(치환 전)이 선택됐는지 반환한다.
 * 화면에는 안 쓰이고, 랭킹(Top5/Worst5)에서 같은 문장이 반복 등장하지 않는지
 * 테스트로 검증하기 위한 용도로 노출한다.
 */
export function getTemplateForPair(a: string, b: string, category: MbtiCompatibilityCategory): string {
    const score = computeScore(a, b, category)
    const bucket = bucketOf(score)
    const variants = TEMPLATES[category][bucket]
    const variantIndex = hashString(a + b + category) % variants.length
    return variants[variantIndex]
}

function describe(a: string, b: string, category: MbtiCompatibilityCategory): string {
    return fillTemplate(getTemplateForPair(a, b, category), a, b, category)
}

function buildRow(a: string, b: string): MbtiCompatibilityRow {
    const row = {} as MbtiCompatibilityRow
    for (const category of CATEGORIES) {
        const score = computeScore(a, b, category)
        row[category] = {score, description: describe(a, b, category)}
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
