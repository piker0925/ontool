import {createRouter, createWebHistory, isNavigationFailure, NavigationFailureType} from 'vue-router'
import {BRAND} from '../config/brand'
import {ZONES} from '../config/zones'
import {MOCK_MODULES} from '../api/mock'
import {trackPageView} from '../config/analytics'
import {useRouteLoadingBar} from '../composables/useRouteLoadingBar'

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/', component: () => import('../pages/LandingPage.vue'), meta: {layout: 'bare'}},
        {path: '/auth/callback', component: () => import('../pages/AuthCallback.vue'), meta: {layout: 'bare'}},
        {path: '/dev', component: () => import('../pages/ZoneHomePage.vue'), props: {zoneId: 'dev'}},
        {path: '/files', component: () => import('../pages/ZoneHomePage.vue'), props: {zoneId: 'files'}},
        {path: '/life', component: () => import('../pages/ZoneHomePage.vue'), props: {zoneId: 'life'}},
        {path: '/fun', component: () => import('../pages/ZoneHomePage.vue'), props: {zoneId: 'fun'}},

        // 통합 도구로 흡수된 구 URL 리다이렉트
        {path: '/tools/sha256', redirect: '/tools/multi-hash'},
        {path: '/tools/base64', redirect: '/tools/encoder?mode=base64-encode'},
        {path: '/tools/url-encode', redirect: '/tools/encoder?mode=url-encode'},
        {path: '/tools/html-entity', redirect: '/tools/encoder?mode=html-encode'},
        {path: '/tools/json-yaml', redirect: '/tools/data-convert?from=json&to=yaml'},
        {path: '/tools/json-toml', redirect: '/tools/data-convert?from=json&to=toml'},
        {path: '/tools/json-xml', redirect: '/tools/data-convert?from=json&to=xml'},
        {path: '/tools/csv-json', redirect: '/tools/data-convert?from=csv&to=json'},
        {path: '/tools/qr-code', redirect: '/tools/code-gen?format=qr'},
        {path: '/tools/barcode', redirect: '/tools/code-gen?format=code128'},
        {path: '/tools/case-converter', redirect: '/tools/text-utils?tab=case'},
        {path: '/tools/char-count', redirect: '/tools/text-utils?tab=count'},
        {path: '/tools/keyboard-convert', redirect: '/tools/text-utils?tab=keyboard'},
        {path: '/tools/whitespace', redirect: '/tools/text-utils?tab=whitespace'},

        {path: '/tools/:moduleId', component: () => import('../pages/ToolPage.vue')},
        {path: '/suggestions', component: () => import('../pages/SuggestionPage.vue')},
        {path: '/admin', component: () => import('../pages/AdminPage.vue')},
        {path: '/privacy', component: () => import('../pages/PrivacyPage.vue')},
        {path: '/mypage', component: () => import('../pages/MyPage.vue')},
    ],
})

// 183: 라우트가 전부 동적 import(코드 스플리팅)라 청크 다운로드 중 아무 표시가 없던 문제 —
// 네비게이션 시작~종료를 상단 프로그레스 바(useRouteLoadingBar)로 감싼다.
const {start: startRouteLoadingBar, finish: finishRouteLoadingBar} = useRouteLoadingBar()

router.beforeEach(() => {
    startRouteLoadingBar()
})

router.onError(() => {
    // 청크 로딩 실패(네트워크 오류 등)로 afterEach 없이 네비게이션이 끊길 수 있어 안전망으로 둔다.
    finishRouteLoadingBar()
})

function setPageMeta(title: string, description: string) {
    document.title = `${title} · ${BRAND.siteName}`
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'description')
        document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)
}

router.afterEach((to, _from, failure) => {
    // 취소된 네비게이션(사용자가 로딩 중 다른 링크를 눌러 앞선 전환이 밀려난 경우)에서는 로딩 바의
    // finish()를 부르면 안 된다 — 취소된 쪽의 afterEach는 자신의(이미 버려진) 청크 로딩이 실제로
    // 끝날 때까지 늦게 도착할 수 있어(실측 확인, 183), 먼저 완료된 최신 네비게이션의 afterEach보다
    // 뒤늦게 와서 바를 계속 붙잡아 둘 수 있다.
    if (!isNavigationFailure(failure, NavigationFailureType.cancelled)) {
        finishRouteLoadingBar()
    }

    trackPageView(to.path)

    const zone = ZONES.find(z => z.route === to.path)
    if (zone) {
        setPageMeta(zone.name, zone.description)
        return
    }
    const moduleId = to.params.moduleId as string | undefined
    const mod = moduleId ? MOCK_MODULES.find(m => m.id === moduleId) : undefined
    if (mod) {
        setPageMeta(mod.name, mod.description ?? BRAND.slogan)
        return
    }
    if (to.path === '/privacy') {
        setPageMeta('개인정보처리방침', `${BRAND.siteName}이 수집하는 개인정보 항목과 보유 기간을 안내합니다.`)
        return
    }
    if (to.path === '/mypage') {
        setPageMeta('마이페이지', '내 계정 정보와 활동 내역을 관리합니다.')
        return
    }
    document.title = BRAND.siteName
})
