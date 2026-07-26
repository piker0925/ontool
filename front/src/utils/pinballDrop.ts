/**
 * 마블 룰렛(참가자별 구슬 동시 투입, 완주 순서로 순위 결정) 물리 시뮬레이션.
 *
 * 참고: lazygyu/roulette(https://lazygyu.github.io/roulette/)의 컨셉("참가자마다 구슬 하나씩
 * 동시에 장애물 코스에 투입해 완주 순서로 순위를 매긴다")을 따르되, 코드는 그대로 가져오지 않고
 * 이 파일에서 직접 구현했다. 무거운 물리 엔진 없이 순수 JS로 구현한다(이슈 170).
 *
 * 좌표계: 코스는 가로 방향(+x가 결승선 방향)이다. "중력"은 실제 수직 낙하가 아니라 코스를 따라
 * 구슬을 결승선 쪽으로 밀어내는 구동 가속도로 해석한다(기울어진 핀볼 트랙을 위에서 내려다본 모델).
 * y축은 코스의 폭(위/아래 벽) 방향으로, 장애물(핀)에 부딪힐 때만 값이 바뀐다.
 */

export interface Peg {
    x: number
    y: number
    radius: number
}

export interface BallState {
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    finished: boolean
    /** 결승선을 넘은 스텝 번호. 아직 완주하지 않았으면 null. */
    finishStep: number | null
    /** 완주 스텝에서 결승선을 얼마나 초과해 지났는지(동일 스텝 동시 완주 시 순위 타이브레이커). */
    finishOvershoot: number | null
}

export interface CourseConfig {
    /** 결승선까지의 거리(물리 단위, px 기준으로 렌더링). */
    length: number
    /** 코스 폭(위/아래 벽 사이 거리). */
    width: number
    ballRadius: number
    pegRadius: number
    /** 구슬을 결승선 방향으로 미는 구동 가속도. */
    gravity: number
    /** 충돌 후 남는 속도 비율(0~1, 감쇠). */
    restitution: number
    /** 시뮬레이션 스텝 간격(초). */
    dt: number
    /** 안전장치: 이 스텝을 넘기면 강제 종료(모든 미완주 구슬은 그 시점 순위로 확정). */
    maxSteps: number
}

export interface RaceResult {
    names: string[]
    config: CourseConfig
    pegs: Peg[]
    /** 참가자 인덱스를 완주 순서(1등부터)로 정렬한 배열. */
    ranking: number[]
    /** 참가자 인덱스에 대응하는 완주 스텝(미완주면 null). */
    finishSteps: (number | null)[]
    /** frames[step][참가자 인덱스] = 그 스텝에서의 위치. 애니메이션 재생용. */
    frames: {x: number; y: number}[][]
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

/** mulberry32 — 시드 하나로 결정론적인 [0, 1) 의사난수 시퀀스를 만드는 경량 PRNG. */
function mulberry32(seed: number): () => number {
    let state = seed | 0
    return function next(): number {
        state = (state + 0x6d2b79f5) | 0
        let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/**
 * 참가자 수에 비례해 코스 길이·폭·구슬 크기를 조정한다.
 * 참가자가 많을수록 코스는 길어지고(레이스가 뭉개지지 않도록) 구슬은 작아진다(겹침 방지).
 */
export function buildCourseConfig(participantCount: number): CourseConfig {
    const n = Math.max(1, participantCount)
    const length = clamp(360 + n * 22, 360, 1400)
    const width = clamp(150 + n * 3.5, 150, 320)
    const ballRadius = clamp(9 - n * 0.12, 3, 9)
    const pegRadius = clamp(4 - n * 0.02, 2.5, 4)

    return {
        length,
        width,
        ballRadius,
        pegRadius,
        gravity: 340,
        restitution: 0.55,
        dt: 1 / 60,
        maxSteps: 600,
    }
}

/**
 * 코스 위에 장애물(핀)을 갤턴 보드 방식(지그재그 격자)으로 배치한다. 시작·결승 구간은 비워 둔다.
 * 시드와 무관한 순수 함수 — 장애물 배치는 항상 고정이고, 무작위성은 구슬의 초기 조건에만 있다.
 *
 * 완벽하게 규칙적인 격자는 구슬이 정확히 같은 지점에서 같은 두 핀 사이를 계속 왕복하며 전진하지
 * 못하는 "공명" 정체를 유발할 수 있다. 각 핀 위치에 (레이스 시드와 무관한) 작은 고정 지터를 줘서
 * 이를 완화한다 — generatePegs는 여전히 config만으로 결정되는 순수 함수다.
 *
 * 같은 행에서 이웃한 두 핀 사이의 통로 폭은 항상 구슬 지름보다 넉넉히 넓게 확보한다 — 그렇지
 * 않으면 구슬이 두 핀 사이에 동시에 끼어(양쪽에서 매 스텝 충돌) 전진 속도가 계속 깎이기만 하는
 * "이중 협착" 정체가 생긴다(소규모 참가자 시뮬레이션에서 실측됨). 지터 폭도 이 통로를 다시
 * 좁히지 않도록 작게 제한한다.
 */
export function generatePegs(config: CourseConfig): Peg[] {
    const pegs: Peg[] = []
    const rowSpacing = 46
    const startX = config.length * 0.14
    const endX = config.length * 0.9

    const minPassage = config.ballRadius * 2 + config.pegRadius * 2 + 6
    const maxColsForPassage = Math.max(1, Math.floor(config.width / minPassage) - 1)
    const colsPerRow = Math.max(2, Math.min(maxColsForPassage, Math.round(config.width / 40)))
    const colSpacing = config.width / (colsPerRow + 1)
    const jitterRand = mulberry32(1337)
    // 벽 바로 옆에는 핀을 두지 않는다 — 핀이 벽에 바싹 붙어 있으면 구슬이 "벽과 핀 사이 구석"에
    // 끼어 전진도 후진도 못 하는 물리적 막다른 지점이 생긴다(20명+ 시뮬레이션에서 실측됨).
    // 항상 양쪽 벽을 따라 핀 없는 통로를 남겨 둬서 어떤 구슬도 완전히 갇히지 않게 한다.
    const wallMargin = config.ballRadius + config.pegRadius * 2.5

    let row = 0
    for (let x = startX; x <= endX; x += rowSpacing, row++) {
        const offset = (row % 3) * (colSpacing / 3)
        for (let col = 1; col <= colsPerRow; col++) {
            // 지터는 고정 폭(±2)만 준다 — colSpacing에 비례한 지터를 쓰면 통로 보장(minPassage)이
            // 다시 좁아질 수 있어, 통로 폭 계산과 무관한 작은 절대값으로 제한한다.
            const jitterX = (jitterRand() - 0.5) * 4
            const jitterY = (jitterRand() - 0.5) * 4
            const y = col * colSpacing + offset + jitterY
            if (y > wallMargin && y < config.width - wallMargin) {
                pegs.push({x: x + jitterX, y, radius: config.pegRadius})
            }
        }
    }

    return pegs
}

/**
 * 참가자 수만큼 구슬을 결승선 이전(x<0) 대기 구간에 배치한다.
 * 각 구슬은 자신의 인덱스로 파생된 독립 시드 스트림을 쓴다 — 그래야 특정 인덱스가 구조적으로
 * 항상 결승선에 더 가깝게 출발하거나 항상 같은 장애물 통로를 타는 편향 없이, x·y 모두 매 레이스마다
 * 골고루 갈릴 수 있다(x·y를 인덱스가 아니라 각자의 난수 스트림에서만 뽑는 이유).
 */
export function createInitialBalls(count: number, config: CourseConfig, seed: number): BallState[] {
    if (count < 1) return []

    const spacing = config.ballRadius * 2.4
    const rows = Math.max(1, Math.floor(config.width / spacing))
    const spawnDepth = Math.max(80, spacing * Math.ceil(count / rows) * 0.9)

    const balls: BallState[] = []
    for (let i = 0; i < count; i++) {
        const rand = mulberry32(seed + i * 104729)
        const x = -rand() * spawnDepth
        const y = clamp(rand() * config.width, config.ballRadius, config.width - config.ballRadius)
        const vx = rand() * 15
        const vy = (rand() - 0.5) * 30

        balls.push({
            x,
            y,
            vx,
            vy,
            radius: config.ballRadius,
            finished: false,
            finishStep: null,
            finishOvershoot: null,
        })
    }
    return balls
}

/**
 * 구슬 하나를 한 스텝 전진시킨다(중력 가속 → 위치 갱신 → 벽/장애물 충돌 처리 → 완주 판정).
 * 이미 완주한 구슬은 그대로 반환한다(더 이상 물리 갱신 없음).
 */
export function stepBall(ball: BallState, pegs: Peg[], config: CourseConfig, step: number): BallState {
    if (ball.finished) return ball

    let {x, y, vx, vy} = ball

    // 중력(결승선 방향 구동 가속도) — 속도 먼저 갱신 후 위치 적분(semi-implicit Euler)
    vx += config.gravity * config.dt
    x += vx * config.dt
    y += vy * config.dt

    // 위/아래 벽 충돌: 반사 + 감쇠
    const minY = ball.radius
    const maxY = config.width - ball.radius
    if (y < minY) {
        y = minY
        vy = Math.abs(vy) * config.restitution
    } else if (y > maxY) {
        y = maxY
        vy = -Math.abs(vy) * config.restitution
    }

    // 장애물(핀) 충돌: 겹침을 밀어내고, 충돌 법선 방향 속도 성분을 반사한다.
    // 핀은 둥근 장애물이라 구슬을 옆(y)으로 흘려보내는 효과는 그대로 두되, 전진(x) 속도까지
    // 정면 반사로 깎이게 두면 여러 핀을 연달아 정면으로 맞을 때 전진이 멈추거나 역전되는
    // 정체(막힘) 현상이 생긴다 — 실제로 20명 이상 시뮬레이션에서 관측됨. 그래서 전진 속도에는
    // 최소 유지치를 둬서 "옆으로 스치며 굴러가는" 모델에 가깝게 만든다(완전 탄성 반사가 아님).
    for (const peg of pegs) {
        const dx = x - peg.x
        const dy = y - peg.y
        const dist = Math.hypot(dx, dy)
        const minDist = ball.radius + peg.radius
        if (dist > 0 && dist < minDist) {
            const nx = dx / dist
            const ny = dy / dist
            const overlap = minDist - dist
            x += nx * overlap
            y += ny * overlap

            const vDotN = vx * nx + vy * ny
            if (vDotN < 0) {
                const preVx = vx
                vx -= (1 + config.restitution) * vDotN * nx
                vy -= (1 + config.restitution) * vDotN * ny
                const minVx = preVx > 0 ? preVx * 0.3 : preVx
                if (vx < minVx) vx = minVx
            }
        }
    }

    const rawOvershoot = x - config.length
    const finished = rawOvershoot >= 0

    return {
        x: finished ? config.length : x,
        y,
        vx,
        vy,
        radius: ball.radius,
        finished,
        finishStep: finished ? step : null,
        finishOvershoot: finished ? rawOvershoot : null,
    }
}

/**
 * 완주 순서로 참가자 인덱스를 정렬한다.
 * 우선순위: 완주 스텝 오름차순(먼저 도착) → 동일 스텝이면 결승선 초과 거리 내림차순(더 확실히 넘은 쪽)
 * → 미완주(null)는 항상 뒤로, 미완주끼리는 최종 x가 클수록(더 멀리 간 쪽) 우선 → 마지막은 인덱스로 안정 정렬.
 */
export function rankBalls(balls: BallState[]): number[] {
    return balls
        .map((ball, index) => ({ball, index}))
        .sort((a, b) => {
            const aStep = a.ball.finishStep
            const bStep = b.ball.finishStep

            if (aStep === null && bStep === null) {
                if (b.ball.x !== a.ball.x) return b.ball.x - a.ball.x
                return a.index - b.index
            }
            if (aStep === null) return 1
            if (bStep === null) return -1
            if (aStep !== bStep) return aStep - bStep

            const aOver = a.ball.finishOvershoot ?? 0
            const bOver = b.ball.finishOvershoot ?? 0
            if (bOver !== aOver) return bOver - aOver
            return a.index - b.index
        })
        .map(entry => entry.index)
}

/**
 * 참가자 이름 목록으로 레이스 전체를 실행한다. 매 스텝의 전체 구슬 위치를 frames에 기록해 두므로,
 * 화면에서는 이 결과를 애니메이션 속도에 맞춰 재생만 하면 된다(렌더링 중 물리 재계산 없음 — 참가자
 * 수가 많아도 프레임 드랍 없이 재생하기 위한 설계).
 *
 * seed를 지정하면 항상 같은 레이스(장애물은 원래 고정, 구슬 경로까지)를 재현한다. 생략하면 매 호출
 * 무작위 시드를 사용한다.
 */
export function simulateRace(names: string[], seed?: number): RaceResult {
    const n = names.length
    if (n < 1) throw new Error('참가자는 1명 이상이어야 합니다.')

    const config = buildCourseConfig(n)
    const pegs = generatePegs(config)
    const actualSeed = seed ?? Math.floor(Math.random() * 0xffffffff)

    let balls = createInitialBalls(n, config, actualSeed)
    const frames: {x: number; y: number}[][] = [balls.map(b => ({x: b.x, y: b.y}))]

    for (let step = 1; step <= config.maxSteps; step++) {
        balls = balls.map(b => stepBall(b, pegs, config, step))
        frames.push(balls.map(b => ({x: b.x, y: b.y})))
        if (balls.every(b => b.finished)) break
    }

    return {
        names,
        config,
        pegs,
        ranking: rankBalls(balls),
        finishSteps: balls.map(b => b.finishStep),
        frames,
    }
}
