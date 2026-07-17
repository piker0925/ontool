import axios from 'axios'

// 익명 사용자 식별자 (ADR-0019): 로그인 없이 공정 스케줄링·쿼터의 "버킷" 역할.
// 교차 사이트(Vercel↔OCI)에서 서드파티 쿠키 차단을 피하려고, 쿠키 대신 localStorage 토큰을
// X-Client-Id 헤더로 보낸다. 인증 비밀이 아니라 익명 버킷이므로 JS 가독성은 문제되지 않는다.
//
// crypto.randomUUID()는 보안 컨텍스트(HTTPS 또는 localhost)에서만 존재한다.
// LAN IP로 HTTP 접속(모바일 테스트 등)하면 없으므로 getRandomValues 기반으로 폴백한다.
function generateUuid(): string {
    if (typeof crypto?.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    if (typeof crypto?.getRandomValues === 'function') {
        const bytes = crypto.getRandomValues(new Uint8Array(16))
        bytes[6] = (bytes[6] & 0x0f) | 0x40
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

function clientId(): string {
    try {
        const KEY = 'dtk_cid'
        let id = localStorage.getItem(KEY)
        if (!id) {
            id = generateUuid()
            localStorage.setItem(KEY, id)
        }
        return id
    } catch {
        return generateUuid()
    }
}

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
    headers: {'X-Client-Id': clientId()},
})

// 인플라이트 리프레시 프로미스 공유 (동시 요청 방지)
let refreshPromise: Promise<string | null> | null = null

apiClient.interceptors.request.use((config) => {
    // vueuse/core useStorage 기본값이 로컬스토리지에 저장됨
    const token = localStorage.getItem('dtk_access')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        
        // 401이면서 이미 재시도한 요청이 아니고, refresh URL 자체가 아닌 경우
        if (
            error.response?.status === 401 && 
            !originalRequest._retry && 
            originalRequest.url !== '/api/v1/auth/refresh'
        ) {
            originalRequest._retry = true

            try {
                if (!refreshPromise) {
                    refreshPromise = (async () => {
                        const refreshToken = localStorage.getItem('dtk_refresh')
                        if (!refreshToken) throw new Error('No refresh token')
                        
                        // NOTE: axios 말고 fetch를 쓰거나 별도의 axios 인스턴스를 써도 되지만, 
                        // interceptor 루프를 막기 위해 originalRequest.url 체크를 위에서 했음
                        const { data } = await apiClient.post('/api/v1/auth/refresh', { refreshToken })
                        
                        localStorage.setItem('dtk_access', data.accessToken)
                        localStorage.setItem('dtk_refresh', data.refreshToken)
                        return data.accessToken
                    })()
                }

                const newAccessToken = await refreshPromise
                
                if (newAccessToken) {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                    return apiClient(originalRequest)
                }
            } catch (refreshError) {
                // 리프레시 실패 시 로그아웃 처리
                localStorage.removeItem('dtk_access')
                localStorage.removeItem('dtk_refresh')
                window.location.href = '/' // 완전히 초기화하기 위해 하드 리로드
                return Promise.reject(refreshError)
            } finally {
                refreshPromise = null
            }
        }
        return Promise.reject(error)
    }
)
