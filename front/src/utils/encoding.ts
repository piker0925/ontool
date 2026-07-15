export function encodeBase64(input: string): string {
    const bytes = new TextEncoder().encode(input)
    return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
}

export function decodeBase64(input: string): string {
    const bytes = Uint8Array.from(atob(input), c => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
}

export function encodeBase64Url(input: string): string {
    return encodeBase64(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeBase64Url(input: string): string {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = (4 - padded.length % 4) % 4
    return decodeBase64(padded + '='.repeat(pad))
}

export function encodeUrl(input: string): string {
    return encodeURIComponent(input)
}

export function decodeUrl(input: string): string {
    return decodeURIComponent(input)
}

export function parseQueryString(input: string): Array<{ key: string; value: string; raw: string }> {
    const str = input.trim()
    let qs = str
    try {
        const url = new URL(str)
        qs = url.search.startsWith('?') ? url.search.slice(1) : url.search
    } catch {
        qs = str.startsWith('?') ? str.slice(1) : str
    }
    if (!qs) return []
    return qs.split('&').filter(Boolean).map(pair => {
        const eqIdx = pair.indexOf('=')
        const rawKey = eqIdx >= 0 ? pair.slice(0, eqIdx) : pair
        const rawVal = eqIdx >= 0 ? pair.slice(eqIdx + 1) : ''
        return {
            key: decodeURIComponent(rawKey.replace(/\+/g, ' ')),
            value: decodeURIComponent(rawVal.replace(/\+/g, ' ')),
            raw: rawVal,
        }
    })
}
