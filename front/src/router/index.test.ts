import {describe, expect, it, vi} from 'vitest'
import {ref} from 'vue'
import {router} from './index'
import {trackPageView} from '../config/analytics'

vi.mock('../config/analytics', () => ({trackPageView: vi.fn()}))
// '/' 라우트는 LandingPage를 동적 임포트하는데, 그 모듈이 useTheme을 임포트 시점에 실행한다.
// 이 프로젝트의 jsdom 테스트 환경에서 localStorage가 불완전하게 동작하는 기존 문제(다른 테스트 파일과 동일)를 피하기 위해 모킹한다.
vi.mock('../composables/useTheme', () => ({
    useTheme: () => ({preference: ref('system'), isDark: ref(false), setTheme: vi.fn()}),
}))

describe('router', () => {
    it('/ 라우트가 존재한다', () => {
        const routes = router.getRoutes()
        expect(routes.some(r => r.path === '/')).toBe(true)
    })

    it('/tools/:moduleId 라우트가 존재한다', () => {
        const routes = router.getRoutes()
        expect(routes.some(r => r.path === '/tools/:moduleId')).toBe(true)
    })

    it('/tools/qr-code 는 통합 코드 생성기 QR 형식으로 리다이렉트한다', async () => {
        const resolved = router.resolve('/tools/qr-code')
        expect(resolved.matched[0]?.redirect).toBe('/tools/code-gen?format=qr')
    })

    it('/tools/barcode 는 통합 코드 생성기 Code128 형식으로 리다이렉트한다', async () => {
        const resolved = router.resolve('/tools/barcode')
        expect(resolved.matched[0]?.redirect).toBe('/tools/code-gen?format=code128')
    })

    it.each(['/dev', '/files', '/life', '/fun'])('%s 구역 라우트가 존재한다', (zonePath) => {
        const routes = router.getRoutes()
        expect(routes.some(r => r.path === zonePath)).toBe(true)
    })

    it('/ 는 사이드바 없는 bare 레이아웃으로 렌더된다', () => {
        const resolved = router.resolve('/')
        expect(resolved.meta.layout).toBe('bare')
    })

    it('/ 로 이동하면 title이 사이트명이 된다', async () => {
        await router.push('/')
        expect(document.title).toBe('OnTool')
    })

    it('구역 홈으로 이동하면 title이 구역명 + 사이트명이 되고 meta description이 구역 설명으로 바뀐다', async () => {
        await router.push('/files')

        expect(document.title).toBe('파일·문서 · OnTool')
        expect(document.querySelector('meta[name="description"]')?.getAttribute('content'))
            .toBe('이미지·PDF 등 파일·문서 처리 도구')
    })

    it('도구 페이지로 이동하면 title이 도구명 + 사이트명이 되고 meta description이 도구 설명으로 바뀐다', async () => {
        await router.push('/tools/pdf-merge')

        expect(document.title).toBe('PDF 병합 · OnTool')
        expect(document.querySelector('meta[name="description"]')?.getAttribute('content'))
            .toBe('여러 PDF를 하나로 병합')
    })

    it('라우트 전환마다 trackPageView를 호출한다 (GA4 page_view)', async () => {
        await router.push('/life')

        expect(trackPageView).toHaveBeenCalledWith('/life')
    })
})
