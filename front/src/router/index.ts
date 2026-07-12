import {createRouter, createWebHistory} from 'vue-router'
import HomePage from '../pages/HomePage.vue'

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/', component: HomePage},

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
    ],
})
