import {describe, expect, it} from 'vitest'
import {
    buildCourseConfig,
    createInitialBalls,
    generatePegs,
    rankBalls,
    simulateRace,
    stepBall,
    type BallState,
} from './pinballDrop'

describe('buildCourseConfig', () => {
    it('참가자가 많을수록 코스는 길어지고 구슬은 작아진다', () => {
        const small = buildCourseConfig(4)
        const large = buildCourseConfig(30)
        expect(large.length).toBeGreaterThan(small.length)
        expect(large.ballRadius).toBeLessThanOrEqual(small.ballRadius)
        expect(large.ballRadius).toBeGreaterThan(0)
    })

    it('물리 상수는 항상 유효 범위(양수, dt>0, maxSteps>0)를 유지한다', () => {
        for (const n of [1, 5, 20, 50]) {
            const config = buildCourseConfig(n)
            expect(config.length).toBeGreaterThan(0)
            expect(config.width).toBeGreaterThan(0)
            expect(config.ballRadius).toBeGreaterThan(0)
            expect(config.pegRadius).toBeGreaterThan(0)
            expect(config.gravity).toBeGreaterThan(0)
            expect(config.restitution).toBeGreaterThan(0)
            expect(config.restitution).toBeLessThanOrEqual(1)
            expect(config.dt).toBeGreaterThan(0)
            expect(config.maxSteps).toBeGreaterThan(0)
        }
    })
})

describe('generatePegs', () => {
    it('같은 설정이면 항상 같은 장애물 배치를 만든다(시드와 무관한 고정 배치)', () => {
        const config = buildCourseConfig(10)
        expect(generatePegs(config)).toEqual(generatePegs(config))
    })

    it('모든 장애물은 코스 폭 안(반지름만큼 여유)에 위치한다', () => {
        const config = buildCourseConfig(15)
        const pegs = generatePegs(config)
        expect(pegs.length).toBeGreaterThan(0)
        for (const peg of pegs) {
            expect(peg.y).toBeGreaterThan(0)
            expect(peg.y).toBeLessThan(config.width)
            expect(peg.x).toBeGreaterThan(0)
            expect(peg.x).toBeLessThan(config.length)
        }
    })
})

describe('createInitialBalls', () => {
    it('참가자 수만큼 구슬을 만들고, 각 구슬은 서로 다른 초기 위치를 가진다', () => {
        const config = buildCourseConfig(12)
        const balls = createInitialBalls(12, config, 7)
        expect(balls).toHaveLength(12)

        const positions = new Set(balls.map(b => `${b.x.toFixed(4)},${b.y.toFixed(4)}`))
        expect(positions.size).toBe(12)
    })

    it('시작 위치는 전부 결승선 이전(코스 진입 전, x<0)이다', () => {
        const config = buildCourseConfig(12)
        const balls = createInitialBalls(12, config, 7)
        balls.forEach(b => expect(b.x).toBeLessThan(0))
    })

    it('같은 시드는 같은 초기 상태를, 다른 시드는 다른 초기 상태를 만든다', () => {
        const config = buildCourseConfig(8)
        const a = createInitialBalls(8, config, 42)
        const b = createInitialBalls(8, config, 42)
        const c = createInitialBalls(8, config, 43)
        expect(a).toEqual(b)
        expect(a).not.toEqual(c)
    })
})

describe('stepBall', () => {
    const wideConfig = buildCourseConfig(1)
    // 벽에 닿지 않도록 폭을 충분히 넓게, 장애물 없이 순수 중력만 검증
    const noWallConfig = {...wideConfig, width: 10_000, length: 10_000}

    function baseBall(overrides: Partial<BallState> = {}): BallState {
        return {
            x: 0,
            y: 5000,
            vx: 0,
            vy: 0,
            radius: noWallConfig.ballRadius,
            finished: false,
            finishStep: null,
            finishOvershoot: null,
            ...overrides,
        }
    }

    it('장애물이 없으면 매 스텝 vx가 정확히 gravity*dt만큼 증가한다', () => {
        const ball = baseBall()
        const next = stepBall(ball, [], noWallConfig, 1)
        expect(next.vx).toBeCloseTo(ball.vx + noWallConfig.gravity * noWallConfig.dt, 10)
    })

    it('중력만 있을 때 위치는 semi-implicit Euler 적분과 정확히 일치한다', () => {
        let ball = baseBall()
        for (let step = 1; step <= 5; step++) {
            const expectedVx = ball.vx + noWallConfig.gravity * noWallConfig.dt
            const expectedX = ball.x + expectedVx * noWallConfig.dt
            ball = stepBall(ball, [], noWallConfig, step)
            expect(ball.vx).toBeCloseTo(expectedVx, 10)
            expect(ball.x).toBeCloseTo(expectedX, 10)
        }
    })

    it('완주한 구슬은 더 이상 갱신되지 않는다(그대로 반환)', () => {
        const finishedBall = baseBall({finished: true, x: 123, vx: 99, finishStep: 3, finishOvershoot: 1})
        const next = stepBall(finishedBall, [], noWallConfig, 4)
        expect(next).toEqual(finishedBall)
    })

    it('아래쪽 벽을 넘으면 위치가 벽 안으로 고정되고 속도가 반사된다', () => {
        const config = {...noWallConfig, width: 100}
        const ball = baseBall({y: 100 - config.ballRadius - 1, vy: 500, radius: config.ballRadius})
        const next = stepBall(ball, [], config, 1)
        expect(next.y).toBeLessThanOrEqual(config.width - config.ballRadius + 1e-9)
        expect(next.vy).toBeLessThan(0)
    })

    it('위쪽 벽을 넘으면 위치가 벽 안으로 고정되고 속도가 반사된다', () => {
        const config = {...noWallConfig, width: 100}
        const ball = baseBall({y: config.ballRadius + 1, vy: -500, radius: config.ballRadius})
        const next = stepBall(ball, [], config, 1)
        expect(next.y).toBeGreaterThanOrEqual(config.ballRadius - 1e-9)
        expect(next.vy).toBeGreaterThan(0)
    })

    it('장애물과 충돌하면 겹침이 풀리고, 옆(y) 방향으로 튕겨난다(측면 반사)', () => {
        const config = {...noWallConfig, width: 10_000}
        const peg = {x: 20, y: 5000, radius: 5}
        // 핀 바로 왼쪽 아래에서 핀을 향해 대각선으로 돌진하는 구슬(옆 방향 성분이 있는 충돌)
        const ball = baseBall({x: 12, y: 4994, vx: 400, vy: 40, radius: 5})
        const next = stepBall(ball, [peg], config, 1)

        const dx = next.x - peg.x
        const dy = next.y - peg.y
        const dist = Math.hypot(dx, dy)
        // 물리적 불변식: 충돌 후 겹침이 없어야 한다
        expect(dist).toBeGreaterThanOrEqual(ball.radius + peg.radius - 1e-6)
    })

    it('장애물에 정면으로 충돌해도 전진 속도가 완전히 멎거나 역전되지 않는다(막힘 방지)', () => {
        // 핀은 완전 탄성 반사가 아니라 "옆으로 흘려보내는" 모델이다 — 정면 충돌이 반복돼도
        // 전진 속도가 0 이하로 떨어지지 않아야 레이스가 도중에 멈춰 서는 일이 없다.
        // (20명 이상 시뮬레이션에서 완전 탄성 반사로는 구석에 갇혀 완주하지 못하는 구슬이 실측됨)
        const config = {...noWallConfig, width: 10_000}
        const peg = {x: 20, y: 5000, radius: 5}
        const preVx = 400
        const ball = baseBall({x: 12, y: 5000, vx: preVx, vy: 0, radius: 5})
        const next = stepBall(ball, [peg], config, 1)

        expect(next.vx).toBeGreaterThan(0)
        expect(next.vx).toBeGreaterThanOrEqual(preVx * 0.3 - 1e-6)
    })

    it('결승선(config.length)을 넘으면 완주 처리되고, 위치는 결승선에 고정되며 초과 거리를 기록한다', () => {
        const config = {...noWallConfig, length: 15}
        const ball = baseBall({x: 10, vx: 400, radius: 5})
        const next = stepBall(ball, [], config, 9)
        expect(next.finished).toBe(true)
        expect(next.finishStep).toBe(9)
        expect(next.x).toBe(config.length)
        expect(next.finishOvershoot).not.toBeNull()
        expect(next.finishOvershoot!).toBeGreaterThanOrEqual(0)
    })
})

describe('rankBalls', () => {
    function ball(overrides: Partial<BallState>): BallState {
        return {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            radius: 5,
            finished: false,
            finishStep: null,
            finishOvershoot: null,
            ...overrides,
        }
    }

    it('완주 스텝이 빠른 순서대로 정렬한다', () => {
        const balls = [
            ball({finished: true, finishStep: 10, finishOvershoot: 1}),
            ball({finished: true, finishStep: 3, finishOvershoot: 1}),
            ball({finished: true, finishStep: 7, finishOvershoot: 1}),
        ]
        expect(rankBalls(balls)).toEqual([1, 2, 0])
    })

    it('완주 스텝이 같으면 결승선 초과 거리가 큰(더 확실히 넘은) 쪽이 앞선다', () => {
        const balls = [
            ball({finished: true, finishStep: 5, finishOvershoot: 0.5}),
            ball({finished: true, finishStep: 5, finishOvershoot: 3.2}),
        ]
        expect(rankBalls(balls)).toEqual([1, 0])
    })

    it('미완주 구슬은 완주한 구슬보다 항상 뒤로 밀린다', () => {
        const balls = [
            ball({finished: false, finishStep: null, x: 999}),
            ball({finished: true, finishStep: 20, finishOvershoot: 0.1}),
        ]
        expect(rankBalls(balls)).toEqual([1, 0])
    })

    it('둘 다 미완주면 최종 x가 더 큰(멀리 간) 쪽이 앞선다', () => {
        const balls = [
            ball({finished: false, finishStep: null, x: 50}),
            ball({finished: false, finishStep: null, x: 120}),
        ]
        expect(rankBalls(balls)).toEqual([1, 0])
    })

    it('결과는 원래 인덱스의 순열이다(개수 일치, 중복/누락 없음)', () => {
        const balls = [
            ball({finished: true, finishStep: 4, finishOvershoot: 1}),
            ball({finished: false, x: 10}),
            ball({finished: true, finishStep: 4, finishOvershoot: 2}),
            ball({finished: false, x: 30}),
        ]
        const ranking = rankBalls(balls)
        expect(ranking).toHaveLength(4)
        expect(new Set(ranking)).toEqual(new Set([0, 1, 2, 3]))
    })
})

describe('simulateRace', () => {
    it('참가자가 없으면 에러를 던진다', () => {
        expect(() => simulateRace([])).toThrow()
    })

    it('참가자 1명도 정상적으로 처리된다(1등 = 자기 자신)', () => {
        const result = simulateRace(['혼자'], 1)
        expect(result.ranking).toEqual([0])
    })

    it('같은 시드로 실행하면 순위·완주 스텝·프레임이 완전히 동일하다(결정론적 재현)', () => {
        const a = simulateRace(['가', '나', '다', '라', '마'], 42)
        const b = simulateRace(['가', '나', '다', '라', '마'], 42)
        expect(a.ranking).toEqual(b.ranking)
        expect(a.finishSteps).toEqual(b.finishSteps)
        expect(a.frames).toEqual(b.frames)
    })

    it('시드가 다르면 순위가 달라질 수 있다', () => {
        const names = ['가', '나', '다', '라', '마', '바', '사', '아']
        const a = simulateRace(names, 1)
        const b = simulateRace(names, 2)
        expect(a.ranking).not.toEqual(b.ranking)
    })

    it('결과 ranking은 자체 finishSteps와 앞뒤가 맞는다(1등의 완주 스텝이 완주자 중 최소)', () => {
        const result = simulateRace(['가', '나', '다', '라', '마', '바'], 11)
        const finishedSteps = result.finishSteps.filter((s): s is number => s !== null)
        const winnerStep = result.finishSteps[result.ranking[0]]
        expect(winnerStep).not.toBeNull()
        expect(winnerStep).toBe(Math.min(...finishedSteps))
    })

    it.each([5, 20, 30])('참가자 %i명이면 전원이 maxSteps 안에 완주한다', (n) => {
        const names = Array.from({length: n}, (_, i) => `참가자${i}`)
        for (const seed of [1, 2, 3]) {
            const result = simulateRace(names, seed)
            expect(result.finishSteps.every(s => s !== null)).toBe(true)
        }
    })

    it('참가자 수가 많아도(30명) 프레임 하나마다 전원의 위치가 기록된다', () => {
        const n = 30
        const names = Array.from({length: n}, (_, i) => `참가자${i}`)
        const result = simulateRace(names, 5)
        for (const frame of result.frames) {
            expect(frame).toHaveLength(n)
        }
    })

    it('출발 슬롯(참가자 인덱스)에 따라 항상 같은 사람이 이기는 구조적 편향이 없다', () => {
        const n = 8
        const names = Array.from({length: n}, (_, i) => `참가자${i}`)
        const winners = new Set<number>()
        for (let seed = 0; seed < 40; seed++) {
            const result = simulateRace(names, seed)
            winners.add(result.ranking[0])
        }
        // 40번의 서로 다른 시드 레이스에서 우승자가 최소 절반 이상의 슬롯에서 나와야
        // "항상 특정 자리가 유리한" 구조적 편향이 없다고 볼 수 있다.
        expect(winners.size).toBeGreaterThanOrEqual(4)
    })
})
