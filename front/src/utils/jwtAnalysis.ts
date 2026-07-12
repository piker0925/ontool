// ── JWT 분석 유틸 (jwt-decoder 전용) ──────────────────────────────────────────

export type AlgRisk = 'ok' | 'warn' | 'critical'

export interface AlgAssessment {
    risk: AlgRisk
    label: string
    note: string
}

const KNOWN_ALG_RE = /^(HS|RS|ES|PS)(256|384|512)$/

export function assessAlgorithm(alg: unknown): AlgAssessment {
    const a = typeof alg === 'string' ? alg : ''
    if (!a || a.toLowerCase() === 'none') {
        return {
            risk: 'critical',
            label: a || '없음',
            note: "'none' 알고리즘은 서명 검증을 우회합니다. 절대 신뢰하면 안 됩니다.",
        }
    }
    if (KNOWN_ALG_RE.test(a)) {
        if (a.startsWith('HS')) {
            return {
                risk: 'ok',
                label: a,
                note: '대칭키(HMAC) 방식. 비밀키가 유출되면 위조 가능하므로 다중 서비스 환경에서는 RS256/ES256 권장.',
            }
        }
        return {risk: 'ok', label: a, note: '공개키 기반 서명 방식. 공개키만으로 검증 가능합니다.'}
    }
    return {risk: 'warn', label: a, note: '표준적이지 않은 알고리즘입니다. 라이브러리 지원 여부를 확인하세요.'}
}

// ── 시간 ─────────────────────────────────────────────────────────────────────

/** 초 단위 기간을 "1일 2시간 3분" / "5분 42초" 형식으로. 항상 0 이상으로 취급. */
export function formatDuration(totalSeconds: number): string {
    const t = Math.max(0, Math.floor(totalSeconds))
    const d = Math.floor(t / 86400)
    const h = Math.floor((t % 86400) / 3600)
    const m = Math.floor((t % 3600) / 60)
    const sec = t % 60
    if (d > 0) return `${d}일 ${h}시간 ${m}분`
    if (h > 0) return `${h}시간 ${m}분 ${sec}초`
    if (m > 0) return `${m}분 ${sec}초`
    return `${sec}초`
}

/** 숫자 클레임이 Unix timestamp로 보이는지 (초: ~1973년 이후, 밀리초 포함 1e14 미만). */
export function isLikelyUnixTimestamp(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 1e8 && value < 1e14
}

/** 초/밀리초 자동 판별 후 ISO 문자열로. */
export function timestampToIso(value: number): string {
    const ms = value >= 1e12 ? value : value * 1000
    return new Date(ms).toISOString()
}

// ── 복사 ─────────────────────────────────────────────────────────────────────

/** 클레임 값을 클립보드용 텍스트로 — 문자열은 원문 그대로, 그 외는 JSON 표현. */
export function claimCopyText(value: unknown): string {
    if (typeof value === 'string') return value
    return JSON.stringify(value)
}

// ── 검증 요약 ─────────────────────────────────────────────────────────────────

export const STANDARD_CLAIMS = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'] as const

export interface JwtSummary {
    alg: AlgAssessment
    exp: number | null
    /** exp 없으면 null */
    expired: boolean | null
    /** exp - now (초). exp 없으면 null */
    expDelta: number | null
    notYetValid: boolean
    standardClaims: number
    totalClaims: number
}

export function summarizeJwt(
    header: Record<string, unknown>,
    payload: Record<string, unknown>,
    nowSec: number,
): JwtSummary {
    const exp = typeof payload.exp === 'number' ? payload.exp : null
    const nbf = typeof payload.nbf === 'number' ? payload.nbf : null
    const claimKeys = Object.keys(payload)
    return {
        alg: assessAlgorithm(header.alg),
        exp,
        expired: exp === null ? null : exp < nowSec,
        expDelta: exp === null ? null : exp - nowSec,
        notYetValid: nbf !== null && nbf > nowSec,
        standardClaims: claimKeys.filter(k => (STANDARD_CLAIMS as readonly string[]).includes(k)).length,
        totalClaims: claimKeys.length,
    }
}
