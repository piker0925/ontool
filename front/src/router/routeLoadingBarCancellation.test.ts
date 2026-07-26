import {beforeEach, describe, expect, it} from 'vitest'
import {createRouter, createMemoryHistory, isNavigationFailure, NavigationFailureType} from 'vue-router'
import {__resetRouteLoadingBarForTest, useRouteLoadingBar} from '../composables/useRouteLoadingBar'

/**
 * 183 — router/index.ts와 동일한 beforeEach/afterEach 배선을 재현해, 실제로 겪은 회귀를 고정한다.
 *
 * 실측(실제 vue-router 4 동작, 이 저장소 버전 기준): 사용자가 느린 라우트 A로 이동 중 다른 라우트
 * B로 다시 이동하면(=A가 취소됨), 이벤트 순서는
 *   before:A → before:B → after:B(ok) → after:A(cancelled)
 * 이다. 즉 A의 cancelled afterEach는 A 자신의(이미 버려진) 동적 import가 실제로 끝날 때까지
 * "늦게" 도착한다 — B가 이미 렌더된 한참 뒤일 수 있다. start()/finish() 호출 횟수를 카운터로
 * 맞추는 구현은 이 늦은 신호를 기다리다 로딩 바가 화면에 계속 걸려 있는 버그를 냈다.
 * 고친 방식: router 쪽에서 cancelled failure는 애초에 finish()를 호출하지 않는다.
 */
function delayedComponent(ms: number) {
    return () => new Promise(resolve => setTimeout(() => resolve({template: '<div/>'}), ms))
}

describe('183: 취소된 네비게이션이 로딩 바를 화면에 붙잡아 두지 않는다', () => {
    beforeEach(() => {
        __resetRouteLoadingBarForTest()
    })

    it('느린 라우트(A)가 아직 로딩 중일 때 빠른 라우트(B)로 갈아타면, B가 렌더되는 즉시 바가 사라진다 — A의 늦은 cancelled afterEach를 기다리지 않는다', async () => {
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                {path: '/', component: {template: '<div/>'}},
                {path: '/a', component: delayedComponent(2000)}, // 사용자가 포기하고 떠날 만큼 느린 청크
                {path: '/b', component: delayedComponent(10)},
            ],
        })

        const {isVisible, start, finish} = useRouteLoadingBar()

        router.beforeEach(() => {
            start()
        })
        router.afterEach((_to, _from, failure) => {
            if (isNavigationFailure(failure, NavigationFailureType.cancelled)) return
            finish()
        })

        await router.push('/') // 초기 진입

        const pA = router.push('/a')
        await new Promise(r => setTimeout(r, 20)) // A의 beforeEach가 실행되고 동적 import가 진행 중인 상태를 확보
        const pB = router.push('/b') // 사용자가 로딩 중 마음을 바꿔 B로 이동 — A는 취소된다

        await Promise.allSettled([pA, pB])

        expect(router.currentRoute.value.path).toBe('/b')
        expect(isVisible.value).toBe(false)

        // 회귀 재현 지점: 카운터 방식이었을 때는 finish()가 이미 "다른 전환이 진행 중"이라 조기
        // return하는 바람에 A가 걸어둔 지연 타이머(SHOW_DELAY_MS=180ms)를 취소하지 못했다 — 그 결과
        // B가 화면에 렌더된 지 한참(180ms) 뒤에 바가 뜬금없이 나타나 버렸다. 그 창을 지나도 계속
        // 숨어 있어야 한다.
        await new Promise(r => setTimeout(r, 200))
        expect(isVisible.value).toBe(false)

        // A의 늦은 cancelled afterEach가 도착해도(2000ms 대기) 상태가 다시 어긋나지 않는지 확인.
        await new Promise(r => setTimeout(r, 2000))
        expect(isVisible.value).toBe(false)
    }, 15000)
})
