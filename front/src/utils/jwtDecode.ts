import {decodeBase64} from './encoding'

export function decodeJwt(token: string): { header: unknown; payload: unknown } {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('JWT 형식이 올바르지 않습니다.')
    const decode = (part: string) => {
        const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(
            part.length + (4 - (part.length % 4)) % 4, '='
        )
        return JSON.parse(decodeBase64(padded))
    }
    return {header: decode(parts[0]), payload: decode(parts[1])}
}
