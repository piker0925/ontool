import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SHOW_DELAY_MS, __resetRouteLoadingBarForTest, useRouteLoadingBar} from './useRouteLoadingBar'

describe('useRouteLoadingBar', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        __resetRouteLoadingBarForTest()
    })

    afterEach(() => {
        __resetRouteLoadingBarForTest()
        vi.useRealTimers()
    })

    it('지연 임계값(SHOW_DELAY_MS) 전에 finish()가 오면 바가 한 번도 노출되지 않는다', () => {
        const {isVisible, start, finish} = useRouteLoadingBar()

        start()
        vi.advanceTimersByTime(SHOW_DELAY_MS - 1)
        expect(isVisible.value).toBe(false)

        finish()
        // 남은 지연 타이머까지 흘려보내도 이미 취소됐으므로 노출되지 않아야 한다.
        vi.advanceTimersByTime(SHOW_DELAY_MS * 5)
        expect(isVisible.value).toBe(false)
    })

    it('지연 임계값을 넘겨도 로딩이 끝나지 않으면 바가 노출된다', () => {
        const {isVisible, start} = useRouteLoadingBar()

        start()
        vi.advanceTimersByTime(SHOW_DELAY_MS)
        expect(isVisible.value).toBe(true)
    })

    it('노출된 뒤 finish()하면 progress가 100까지 찬 뒤 사라진다', () => {
        const {isVisible, progress, start, finish} = useRouteLoadingBar()

        start()
        vi.advanceTimersByTime(SHOW_DELAY_MS)
        expect(isVisible.value).toBe(true)

        finish()
        expect(progress.value).toBe(100)
        expect(isVisible.value).toBe(true) // 페이드 아웃 유예 시간 동안은 여전히 보임

        vi.advanceTimersByTime(199)
        expect(isVisible.value).toBe(true)

        vi.advanceTimersByTime(1)
        expect(isVisible.value).toBe(false)
        expect(progress.value).toBe(0)
    })

    it('노출 전 progress는 시간이 지날수록 100 미만에서 점점 채워진다', () => {
        const {progress, start} = useRouteLoadingBar()

        start()
        vi.advanceTimersByTime(SHOW_DELAY_MS) // 노출 + 트리클 시작
        const afterShow = progress.value

        vi.advanceTimersByTime(200)
        expect(progress.value).toBeGreaterThan(afterShow)
        expect(progress.value).toBeLessThan(100)
    })

    it('겹치는 네비게이션(빠른 연속 전환)에서 두 번째 start()는 지연 타이머를 다시 걸지 않는다', () => {
        const {isVisible, start} = useRouteLoadingBar()

        start() // 첫 번째 전환 시작
        vi.advanceTimersByTime(SHOW_DELAY_MS - 1)
        expect(isVisible.value).toBe(false)

        start() // 사용자가 로딩 중 다른 링크 클릭 — 두 번째 전환 시작(타이머 리셋되면 여기서 또 179ms 대기해야 함)
        vi.advanceTimersByTime(1) // 첫 번째 타이머 기준으로는 정확히 SHOW_DELAY_MS 시점
        expect(isVisible.value).toBe(true) // 리셋되지 않았다면 이미 노출돼 있어야 한다
    })

    it('finish()는 몇 번의 start()가 앞서 있었는지와 무관하게 즉시 반영되는 멱등 동작이다 — router가 취소된 네비게이션의 finish 호출을 걸러주는 것을 전제로 한다(router/index.test.ts에서 검증)', () => {
        const {isVisible, progress, start, finish} = useRouteLoadingBar()

        start() // 첫 번째 전환
        vi.advanceTimersByTime(SHOW_DELAY_MS)
        expect(isVisible.value).toBe(true)

        start() // 두 번째 전환(겹침) — 첫 번째가 아직 안 끝났어도 새 start는 no-op
        finish() // 실제로 완료된(취소되지 않은) 네비게이션의 finish — 즉시 완료 처리로 들어가야 한다
        expect(progress.value).toBe(100)

        vi.advanceTimersByTime(200)
        expect(isVisible.value).toBe(false)
    })

    it('같은 모듈 인스턴스를 공유한다(싱글턴) — 다른 컴포넌트에서 useRouteLoadingBar()를 다시 불러도 같은 상태를 본다', () => {
        const a = useRouteLoadingBar()
        const b = useRouteLoadingBar()

        a.start()
        vi.advanceTimersByTime(SHOW_DELAY_MS)

        expect(b.isVisible.value).toBe(true)
    })
})
