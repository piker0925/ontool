import {describe, expect, it} from 'vitest'
import {
    autoUpgradeCost,
    buyAutoUpgrade,
    buyClickUpgrade,
    click,
    clickUpgradeCost,
    createIdleClickerState,
    tick,
} from './idleClicker'

describe('createIdleClickerState', () => {
    it('코인 0, 클릭당 1, 초당 0으로 시작한다', () => {
        const state = createIdleClickerState()
        expect(state.coins).toBe(0)
        expect(state.coinsPerClick).toBe(1)
        expect(state.coinsPerSecond).toBe(0)
    })
})

describe('click', () => {
    it('클릭하면 coinsPerClick만큼 코인이 늘어난다', () => {
        const state = {...createIdleClickerState(), coinsPerClick: 3}
        const next = click(state)
        expect(next.coins).toBe(3)
    })
})

describe('tick — 자동 획득', () => {
    it('coinsPerSecond가 0이면 시간이 지나도 코인이 늘지 않는다', () => {
        const state = createIdleClickerState()
        const next = tick(state, 5)
        expect(next.coins).toBe(0)
    })

    it('coinsPerSecond*경과초 만큼 코인이 늘어난다', () => {
        const state = {...createIdleClickerState(), coinsPerSecond: 2}
        const next = tick(state, 3)
        expect(next.coins).toBe(6)
    })
})

describe('buyClickUpgrade', () => {
    it('코인이 충분하면 비용을 지불하고 클릭당 획득량이 늘어난다', () => {
        const cost = clickUpgradeCost(0)
        const state = {...createIdleClickerState(), coins: cost}
        const next = buyClickUpgrade(state)
        expect(next.coins).toBe(0)
        expect(next.coinsPerClick).toBe(2)
        expect(next.clickLevel).toBe(1)
    })

    it('코인이 부족하면 구매되지 않고 상태가 그대로 유지된다', () => {
        const cost = clickUpgradeCost(0)
        const state = {...createIdleClickerState(), coins: cost - 1}
        const next = buyClickUpgrade(state)
        expect(next).toEqual(state)
    })

    it('레벨이 오를수록 비용이 커진다(재구매를 무한 반복하지 못하도록)', () => {
        expect(clickUpgradeCost(1)).toBeGreaterThan(clickUpgradeCost(0))
        expect(clickUpgradeCost(5)).toBeGreaterThan(clickUpgradeCost(1))
    })
})

describe('buyAutoUpgrade', () => {
    it('코인이 충분하면 비용을 지불하고 초당 획득량이 늘어난다', () => {
        const cost = autoUpgradeCost(0)
        const state = {...createIdleClickerState(), coins: cost}
        const next = buyAutoUpgrade(state)
        expect(next.coins).toBe(0)
        expect(next.coinsPerSecond).toBe(1)
        expect(next.autoLevel).toBe(1)
    })

    it('코인이 부족하면 구매되지 않고 클릭 업그레이드 상태에는 영향을 주지 않는다', () => {
        const cost = autoUpgradeCost(0)
        const state = {...createIdleClickerState(), coins: cost - 1, coinsPerClick: 7}
        const next = buyAutoUpgrade(state)
        expect(next).toEqual(state)
        expect(next.coinsPerClick).toBe(7)
    })
})
