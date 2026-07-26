import {beforeEach, describe, expect, it, vi} from 'vitest'
import {router} from './index'
import {trackPageView} from '../config/analytics'
import {ZONES} from '../config/zones'
import {BRAND} from '../config/brand'
import {__resetRouteLoadingBarForTest} from '../composables/useRouteLoadingBar'

/**
 * 183 작업 중 발견된, 183 스펙과는 별개인 기존 버그를 고정한다: 취소된 네비게이션(사용자가 로딩 중
 * 다른 링크로 갈아탄 경우)의 afterEach가 trackPageView/setPageMeta를 호출하면, 실제로 화면에 한 번도
 * 렌더되지 않은 라우트가 페이지뷰로 집계되고 문서 title/description도 잘못 갱신된다.
 *
 * routeLoadingBarCancellation.test.ts와 동일한 실측 사실을 이용한다: 취소된 네비게이션의 afterEach는
 * 자신의(이미 버려진) 동적 import가 실제로 끝날 때까지 늦게 도착한다. 그래서 아래 두 번째 테스트는
 * 승자 네비게이션이 이미 반영된 한참 뒤에도(느린 청크가 뒤늦게 resolve된 뒤에도) 상태가 다시
 * 흔들리지 않는지까지 확인한다 — router/index.ts의 early return이 없다면 이 시점에 실패한다.
 *
 * router/index.ts가 실제로 export하는 router 싱글턴을 그대로 사용한다(별도 mock 라우터 재구현 아님).
 */
function delayedComponent(ms: number) {
    return () => new Promise(resolve => setTimeout(() => resolve({template: '<div/>'}), ms))
}

vi.mock('../config/analytics', () => ({trackPageView: vi.fn()}))

describe('183 파생: 취소된 네비게이션은 페이지뷰 트래킹·문서 메타 갱신을 건너뛴다', () => {
    beforeEach(() => {
        __resetRouteLoadingBarForTest()
        vi.mocked(trackPageView).mockClear()
    })

    it('정상 완료된 네비게이션에서는 trackPageView와 setPageMeta(문서 title/description)가 반영된다', async () => {
        const zone = ZONES.find(z => z.id === 'life')!

        await router.push('/life')

        expect(trackPageView).toHaveBeenCalledWith('/life')
        expect(document.title).toBe(`${zone.name} · ${BRAND.siteName}`)
        expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(zone.description)
    })

    it('취소된 네비게이션에서는 trackPageView도 setPageMeta도 호출되지 않는다 — 늦게 도착하는 cancelled afterEach도 마찬가지', async () => {
        const removeSlowRoute = router.addRoute({path: '/__slow-183', component: delayedComponent(2000)})

        try {
            await router.push('/dev') // 기준 상태 확보
            vi.mocked(trackPageView).mockClear()

            const pSlow = router.push('/__slow-183') // 사용자가 느린 라우트로 이동 시작
            await new Promise(r => setTimeout(r, 20)) // beforeEach가 실행되고 동적 import가 진행 중인 상태를 확보
            const pFast = router.push('/files') // 마음을 바꿔 다른 라우트로 이동 — 앞선 네비게이션은 취소된다

            await Promise.allSettled([pSlow, pFast])

            const filesZone = ZONES.find(z => z.id === 'files')!
            expect(router.currentRoute.value.path).toBe('/files')
            expect(trackPageView).toHaveBeenCalledTimes(1)
            expect(trackPageView).toHaveBeenCalledWith('/files')
            expect(document.title).toBe(`${filesZone.name} · ${BRAND.siteName}`)
            expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(filesZone.description)

            // 취소된 '/__slow-183' 쪽의 cancelled afterEach가 뒤늦게 도착해도(자신의 2000ms 청크가 실제로
            // 끝날 때까지) 이미 반영된 '/files' 상태를 덮어쓰면 안 된다. '/__slow-183'은 ZONES/MOCK_MODULES
            // 어디에도 매치되지 않으므로, 건너뛰지 않았다면 document.title이 BRAND.siteName 기본값으로
            // 되돌아가고 trackPageView가 그 경로로 추가 호출됐을 것이다.
            await new Promise(r => setTimeout(r, 2000))
            expect(trackPageView).toHaveBeenCalledTimes(1)
            expect(document.title).toBe(`${filesZone.name} · ${BRAND.siteName}`)
        } finally {
            removeSlowRoute()
        }
    }, 15000)
})
