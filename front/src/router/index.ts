import {createRouter, createWebHistory} from 'vue-router'
import {BRAND} from '../config/brand'
import {ZONES} from '../config/zones'
import {MOCK_MODULES} from '../api/mock'
import {trackPageView} from '../config/analytics'

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/', component: () => import('../pages/LandingPage.vue'), meta: {layout: 'bare'}},
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
    ],
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

router.afterEach(to => {
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
    document.title = BRAND.siteName
})
