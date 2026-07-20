export interface JsonPathMatch {
    path: string
    value: unknown
}

type Segment =
    | { type: 'key'; name: string }
    | { type: 'index'; index: number }
    | { type: 'wildcard' }

function parseSegments(expression: string): Segment[] {
    if (!expression.startsWith('$'))
        throw new Error('JSONPath 표현식은 $로 시작해야 합니다.')

    const rest = expression.slice(1)
    const segments: Segment[] = []
    let i = 0

    while (i < rest.length) {
        const ch = rest[i]
        if (ch === '.') {
            i++
            if (rest[i] === '*') {
                segments.push({type: 'wildcard'})
                i++
                continue
            }
            const start = i
            while (i < rest.length && /[A-Za-z0-9_$]/.test(rest[i])) i++
            if (i === start) throw new Error(`'.' 뒤에 필드명이 필요합니다 (위치 ${i}).`)
            segments.push({type: 'key', name: rest.slice(start, i)})
        } else if (ch === '[') {
            const close = rest.indexOf(']', i)
            if (close === -1) throw new Error('닫는 대괄호 ]가 없습니다.')
            const inner = rest.slice(i + 1, close).trim()
            if (inner === '*') segments.push({type: 'wildcard'})
            else if (/^-?\d+$/.test(inner)) segments.push({type: 'index', index: Number(inner)})
            else if (/^'[^']*'$/.test(inner) || /^"[^"]*"$/.test(inner)) segments.push({type: 'key', name: inner.slice(1, -1)})
            else throw new Error(`대괄호 표현식을 해석할 수 없습니다: [${inner}]`)
            i = close + 1
        } else {
            throw new Error(`'${ch}' 문자를 해석할 수 없습니다 (위치 ${i + 1}).`)
        }
    }

    return segments
}

export function queryJsonPath(data: unknown, expression: string): JsonPathMatch[] {
    const segments = parseSegments(expression.trim())
    let current: JsonPathMatch[] = [{path: '$', value: data}]

    for (const seg of segments) {
        const next: JsonPathMatch[] = []
        for (const {path, value} of current) {
            if (seg.type === 'key') {
                if (value !== null && typeof value === 'object' && !Array.isArray(value) && seg.name in value)
                    next.push({path: `${path}.${seg.name}`, value: (value as Record<string, unknown>)[seg.name]})
            } else if (seg.type === 'index') {
                if (Array.isArray(value)) {
                    const idx = seg.index < 0 ? value.length + seg.index : seg.index
                    if (idx >= 0 && idx < value.length) next.push({path: `${path}[${idx}]`, value: value[idx]})
                }
            } else {
                if (Array.isArray(value)) {
                    value.forEach((v, idx) => next.push({path: `${path}[${idx}]`, value: v}))
                } else if (value !== null && typeof value === 'object') {
                    for (const [k, v] of Object.entries(value as Record<string, unknown>))
                        next.push({path: `${path}.${k}`, value: v})
                }
            }
        }
        current = next
    }

    return current
}
