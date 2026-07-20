export type JsonDiffKind = 'added' | 'removed' | 'changed'

export interface JsonDiffEntry {
    path: string
    kind: JsonDiffKind
    oldValue?: unknown
    newValue?: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (Array.isArray(a) && Array.isArray(b))
        return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
    if (isPlainObject(a) && isPlainObject(b)) {
        const aKeys = Object.keys(a)
        const bKeys = Object.keys(b)
        return aKeys.length === bKeys.length && aKeys.every(k => k in b && deepEqual(a[k], b[k]))
    }
    return false
}

function walk(path: string, a: unknown, b: unknown, out: JsonDiffEntry[]): void {
    if (deepEqual(a, b)) return

    if (isPlainObject(a) && isPlainObject(b)) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)])
        for (const key of keys) {
            const childPath = `${path}.${key}`
            const inA = key in a
            const inB = key in b
            if (!inA) out.push({path: childPath, kind: 'added', newValue: b[key]})
            else if (!inB) out.push({path: childPath, kind: 'removed', oldValue: a[key]})
            else walk(childPath, a[key], b[key], out)
        }
        return
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        const len = Math.max(a.length, b.length)
        for (let i = 0; i < len; i++) {
            const childPath = `${path}[${i}]`
            if (i >= a.length) out.push({path: childPath, kind: 'added', newValue: b[i]})
            else if (i >= b.length) out.push({path: childPath, kind: 'removed', oldValue: a[i]})
            else walk(childPath, a[i], b[i], out)
        }
        return
    }

    out.push({path, kind: 'changed', oldValue: a, newValue: b})
}

export function diffJson(a: unknown, b: unknown): JsonDiffEntry[] {
    const out: JsonDiffEntry[] = []
    walk('$', a, b, out)
    return out
}
