import {describe, expect, it} from 'vitest'
import {router} from './index'

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
})
