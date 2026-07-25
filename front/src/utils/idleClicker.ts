// 방치형 클리커: 클릭으로 코인을 모으고, 코인으로 업그레이드를 사서 클릭당 획득량과
// 초당 자동 획득량을 늘린다. 게임 종료 개념이 없어(방치형 장르 특성) 로그인 저장·리더보드
// 연동은 이번 이슈 범위 밖이다 — 진행 상황은 세션 동안만 유지되는 순수 로컬 상태다.
export interface IdleClickerState {
    coins: number
    clickLevel: number
    autoLevel: number
    coinsPerClick: number
    coinsPerSecond: number
}

const CLICK_BASE_COST = 10
const AUTO_BASE_COST = 25
const COST_MULTIPLIER = 1.15

export function createIdleClickerState(): IdleClickerState {
    return {coins: 0, clickLevel: 0, autoLevel: 0, coinsPerClick: 1, coinsPerSecond: 0}
}

export function clickUpgradeCost(level: number): number {
    return Math.round(CLICK_BASE_COST * Math.pow(COST_MULTIPLIER, level))
}

export function autoUpgradeCost(level: number): number {
    return Math.round(AUTO_BASE_COST * Math.pow(COST_MULTIPLIER, level))
}

export function click(state: IdleClickerState): IdleClickerState {
    return {...state, coins: state.coins + state.coinsPerClick}
}

// deltaSeconds<=0(경과 없음)은 무의미하지만 방어적으로 그대로 반환한다.
export function tick(state: IdleClickerState, deltaSeconds: number): IdleClickerState {
    if (deltaSeconds <= 0 || state.coinsPerSecond === 0) return state
    return {...state, coins: state.coins + state.coinsPerSecond * deltaSeconds}
}

// 코인이 부족하면 아무 변화 없이 같은 참조를 반환한다(호출부가 "구매 실패"를 판별할 수 있게).
export function buyClickUpgrade(state: IdleClickerState): IdleClickerState {
    const cost = clickUpgradeCost(state.clickLevel)
    if (state.coins < cost) return state
    return {
        ...state,
        coins: state.coins - cost,
        clickLevel: state.clickLevel + 1,
        coinsPerClick: state.coinsPerClick + 1,
    }
}

export function buyAutoUpgrade(state: IdleClickerState): IdleClickerState {
    const cost = autoUpgradeCost(state.autoLevel)
    if (state.coins < cost) return state
    return {
        ...state,
        coins: state.coins - cost,
        autoLevel: state.autoLevel + 1,
        coinsPerSecond: state.coinsPerSecond + 1,
    }
}
