import {ref} from 'vue'

/**
 * 183: 라우트가 전부 동적 import(코드 스플리팅)라 청크 다운로드 중 화면이 그대로 멈춰
 * 있는 구간이 있었다(로딩 표시 전무). GitHub/Notion류 상단 얇은 프로그레스 바를
 * `router.beforeEach`에서 start(), 네비게이션 종료 시 finish()로 감싸 표시한다.
 *
 * 캐시 히트 등으로 SHOW_DELAY_MS 안에 끝나는 전환은 바를 한 번도 노출하지 않는다
 * (지연 타이머가 뜨기 전에 finish()가 오면 타이머를 취소) — 깜빡임 방지.
 * 한 번 노출된 뒤에는 progress를 100으로 채우고 FADE_MS만큼 유지했다가 사라진다.
 *
 * start/finish 호출 횟수를 카운터로 맞추지 않는다(과거 시도, 폐기) — vue-router의 취소된
 * 네비게이션은 beforeEach 없이 afterEach만 오거나, afterEach(cancelled)가 자신의 청크가 실제로
 * 끝날 때까지 늦게 도착한다(실측: 취소된 쪽의 import가 2초 걸리면 그 cancelled afterEach도
 * 2초 뒤에야 옴 — 이미 승자 네비게이션이 렌더된 지 한참 뒤). 카운터 방식은 이 늦게 도착한
 * 신호를 기다리다 바가 화면에 계속 걸려 있는 버그를 냈다. 그래서 router 쪽(router/index.ts)이
 * cancelled failure는 애초에 finish()를 호출하지 않도록 걸러내고, 여기 finish()는 "마지막으로
 * 도착한 진짜 완료 신호"를 곧바로 반영하는 멱등 동작으로 단순화한다 — 몇 번의 start()가
 * 앞서 있었는지는 세지 않는다.
 */
export const SHOW_DELAY_MS = 180
const FADE_MS = 200

const isVisible = ref(false)
const progress = ref(0)

let showTimer: ReturnType<typeof setTimeout> | null = null
let fadeTimer: ReturnType<typeof setTimeout> | null = null
let trickleTimer: ReturnType<typeof setInterval> | null = null

function clearShowTimer() {
    if (showTimer !== null) {
        clearTimeout(showTimer)
        showTimer = null
    }
}

function clearFadeTimer() {
    if (fadeTimer !== null) {
        clearTimeout(fadeTimer)
        fadeTimer = null
    }
}

function clearTrickle() {
    if (trickleTimer !== null) {
        clearInterval(trickleTimer)
        trickleTimer = null
    }
}

function startTrickle() {
    clearTrickle()
    trickleTimer = setInterval(() => {
        // 실제 완료(finish) 전에는 100%에 도달하지 않도록 90%를 상한으로 점점 느려지며 채운다.
        progress.value = Math.min(90, progress.value + (90 - progress.value) * 0.15 + 1)
    }, 200)
}

function start() {
    clearFadeTimer()
    // 이미 지연 타이머가 돌고 있거나 바가 떠 있으면(겹치는 네비게이션) 다시 걸지 않는다 —
    // 새 네비게이션이 시작될 때마다 타이머를 리셋하면 연속 클릭 중엔 바가 영영 안 뜰 수 있다.
    if (isVisible.value || showTimer !== null) return

    progress.value = 0
    showTimer = setTimeout(() => {
        showTimer = null
        isVisible.value = true
        startTrickle()
    }, SHOW_DELAY_MS)
}

function finish() {
    clearShowTimer() // 지연 임계값 전에 끝났다면 바는 한 번도 노출되지 않는다
    clearTrickle()

    if (!isVisible.value) {
        progress.value = 0
        return
    }

    progress.value = 100
    fadeTimer = setTimeout(() => {
        fadeTimer = null
        isVisible.value = false
        progress.value = 0
    }, FADE_MS)
}

/** 테스트 전용: 모듈 싱글턴 상태와 타이머를 초기화한다. */
export function __resetRouteLoadingBarForTest() {
    clearShowTimer()
    clearFadeTimer()
    clearTrickle()
    isVisible.value = false
    progress.value = 0
}

export function useRouteLoadingBar() {
    return {isVisible, progress, start, finish}
}
