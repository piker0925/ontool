import {describe, expect, it} from 'vitest'
import {handleReactionClick} from './reactionTime'

describe('handleReactionClick', () => {
    it('waiting 단계(신호가 뜨기 전)에 클릭하면 false-start로 판정한다', () => {
        const next = handleReactionClick({phase: 'waiting', signalAt: null, elapsedMs: null}, 1_000)
        expect(next.phase).toBe('false-start')
    })

    it('ready 단계(신호가 뜬 뒤)에 클릭하면 신호-클릭 시간차를 그대로 계산한다', () => {
        const next = handleReactionClick({phase: 'ready', signalAt: 1_000, elapsedMs: null}, 1_237)
        expect(next.phase).toBe('result')
        expect(next.elapsedMs).toBe(237)
    })

    it('시간차는 고정값이 아니라 실제 클릭 시점에 따라 달라진다', () => {
        const fast = handleReactionClick({phase: 'ready', signalAt: 500, elapsedMs: null}, 620)
        const slow = handleReactionClick({phase: 'ready', signalAt: 500, elapsedMs: null}, 900)
        expect(fast.elapsedMs).toBe(120)
        expect(slow.elapsedMs).toBe(400)
        expect(fast.elapsedMs).not.toBe(slow.elapsedMs)
    })

    it('idle/result/false-start 단계에서의 클릭은 상태를 바꾸지 않는다', () => {
        const idle = {phase: 'idle' as const, signalAt: null, elapsedMs: null}
        expect(handleReactionClick(idle, 1_000)).toEqual(idle)

        const result = {phase: 'result' as const, signalAt: 1_000, elapsedMs: 250}
        expect(handleReactionClick(result, 2_000)).toEqual(result)

        const falseStart = {phase: 'false-start' as const, signalAt: null, elapsedMs: null}
        expect(handleReactionClick(falseStart, 2_000)).toEqual(falseStart)
    })
})
