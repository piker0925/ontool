import {afterEach, describe, expect, it, vi} from 'vitest'

describe('apiClient', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.resetModules()
    })

    it('VITE_API_BASE_URL이 없으면 로컬 백엔드를 기본값으로 사용한다', async () => {
        // 로컬 .env의 실제 값에 기대지 않고, 값이 없는 상황을 직접 스텁한다
        // (로컬 개발용 .env는 LAN 기기 테스트를 위해 빈 문자열을 쓸 수도 있으므로 그 값에 의존하면 안 된다)
        vi.stubEnv('VITE_API_BASE_URL', undefined)
        vi.resetModules()

        const {apiClient} = await import('./client')

        expect(apiClient.defaults.baseURL).toBe('http://localhost:8080')
    })

    it('VITE_API_BASE_URL이 설정되면 그 값을 baseURL로 사용한다', async () => {
        vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
        vi.resetModules()

        const {apiClient: freshClient} = await import('./client')

        expect(freshClient.defaults.baseURL).toBe('https://api.example.com')
    })
})
