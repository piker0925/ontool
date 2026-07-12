// ── JSON 분석 유틸 (json-formatter 전용) ──────────────────────────────────────

export interface JsonErrorLocation {
    message: string
    line: number
    column: number
    position: number
}

export function positionToLineCol(input: string, position: number): { line: number; column: number } {
    const clamped = Math.max(0, Math.min(position, input.length))
    let line = 1
    let column = 1
    for (let i = 0; i < clamped; i++) {
        if (input[i] === '\n') {
            line++
            column = 1
        } else {
            column++
        }
    }
    return {line, column}
}

export function getLine(input: string, line: number): string {
    return input.split('\n')[line - 1] ?? ''
}

class JsonScanError extends Error {
    position: number

    constructor(message: string, position: number) {
        super(message)
        this.position = position
    }
}

/**
 * JSON 파싱 오류의 위치(줄/열)를 브라우저 엔진 메시지에 의존하지 않고 직접 스캔해서 찾는다.
 * 유효한 JSON이면 null 반환.
 */
export function locateJsonSyntaxError(input: string): JsonErrorLocation | null {
    try {
        JSON.parse(input)
        return null
    } catch {
        // 아래 자체 스캐너로 위치 계산
    }
    try {
        scanJson(input)
        // JSON.parse는 실패했지만 스캐너가 통과한 극단적 엣지 케이스 — 위치 없이 처리
        return {message: 'JSON 구문 오류입니다.', ...positionToLineCol(input, 0), position: 0}
    } catch (e: unknown) {
        if (e instanceof JsonScanError) {
            const {line, column} = positionToLineCol(input, e.position)
            return {message: e.message, line, column, position: e.position}
        }
        return {message: 'JSON 구문 오류입니다.', ...positionToLineCol(input, 0), position: 0}
    }
}

function scanJson(s: string): void {
    let i = 0
    const err = (msg: string, pos = i): never => {
        throw new JsonScanError(msg, Math.min(pos, Math.max(0, s.length - 1)))
    }
    const ws = () => {
        while (i < s.length && ' \t\n\r'.includes(s[i])) i++
    }
    const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9'

    function str(): void {
        const start = i
        i++ // 여는 따옴표
        while (i < s.length) {
            const c = s[i]
            if (c === '"') {
                i++
                return
            }
            if (c === '\\') {
                const e = s[i + 1]
                if (e === undefined) break
                if ('"\\/bfnrt'.includes(e)) {
                    i += 2
                } else if (e === 'u') {
                    if (!/^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) err('잘못된 유니코드 이스케이프입니다', i)
                    i += 6
                } else {
                    err(`잘못된 이스케이프 문자 '\\${e}'입니다`, i)
                }
            } else if (c === '\n') {
                err('문자열이 닫히지 않았습니다', start)
            } else {
                i++
            }
        }
        err('문자열이 닫히지 않았습니다', start)
    }

    function num(): void {
        const start = i
        if (s[i] === '-') i++
        if (s[i] === '0') {
            i++
        } else if (isDigit(s[i])) {
            while (isDigit(s[i])) i++
        } else {
            err('잘못된 숫자 형식입니다', start)
        }
        if (s[i] === '.') {
            i++
            if (!isDigit(s[i])) err('잘못된 숫자 형식입니다', start)
            while (isDigit(s[i])) i++
        }
        if (s[i] === 'e' || s[i] === 'E') {
            i++
            if (s[i] === '+' || s[i] === '-') i++
            if (!isDigit(s[i])) err('잘못된 숫자 형식입니다', start)
            while (isDigit(s[i])) i++
        }
    }

    function object(): void {
        i++ // {
        ws()
        if (s[i] === '}') {
            i++
            return
        }
        for (; ;) {
            ws()
            if (s[i] === undefined) err('객체가 닫히지 않았습니다 (\'}\'가 필요합니다)')
            if (s[i] !== '"') err('속성 이름(큰따옴표 문자열)이 필요합니다')
            str()
            ws()
            if (s[i] !== ':') err("':'가 필요합니다")
            i++
            value()
            ws()
            if (s[i] === ',') {
                const commaPos = i
                i++
                ws()
                if (s[i] === '}') err('마지막 속성 뒤에 쉼표가 있습니다', commaPos)
                continue
            }
            if (s[i] === '}') {
                i++
                return
            }
            err(s[i] === undefined ? '객체가 닫히지 않았습니다 (\'}\'가 필요합니다)' : "',' 또는 '}'가 필요합니다")
        }
    }

    function array(): void {
        i++ // [
        ws()
        if (s[i] === ']') {
            i++
            return
        }
        for (; ;) {
            value()
            ws()
            if (s[i] === ',') {
                const commaPos = i
                i++
                ws()
                if (s[i] === ']') err('마지막 요소 뒤에 쉼표가 있습니다', commaPos)
                continue
            }
            if (s[i] === ']') {
                i++
                return
            }
            err(s[i] === undefined ? '배열이 닫히지 않았습니다 (\']\'가 필요합니다)' : "',' 또는 ']'가 필요합니다")
        }
    }

    function value(): void {
        ws()
        if (i >= s.length) err('값이 필요합니다')
        const c = s[i]
        if (c === '{') return object()
        if (c === '[') return array()
        if (c === '"') return str()
        if (c === '-' || isDigit(c)) return num()
        if (s.startsWith('true', i)) {
            i += 4
            return
        }
        if (s.startsWith('false', i)) {
            i += 5
            return
        }
        if (s.startsWith('null', i)) {
            i += 4
            return
        }
        err(`예상치 못한 문자 '${c}'입니다`)
    }

    value()
    ws()
    if (i < s.length) err(`값이 끝난 뒤 예상치 못한 문자 '${s[i]}'가 있습니다`)
}

// ── 통계 ─────────────────────────────────────────────────────────────────────

export interface JsonStats {
    keys: number
    maxDepth: number
    objects: number
    arrays: number
    strings: number
    numbers: number
    booleans: number
    nulls: number
}

/** 컨테이너(객체/배열) 중첩 깊이 기준. 스칼라 루트는 depth 0, `{}`는 1, `{"a":{"b":1}}`은 2. */
export function computeJsonStats(value: unknown): JsonStats {
    const s: JsonStats = {keys: 0, maxDepth: 0, objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0}
    const walk = (v: unknown, depth: number): void => {
        if (v === null) {
            s.nulls++
            return
        }
        if (Array.isArray(v)) {
            s.arrays++
            if (depth + 1 > s.maxDepth) s.maxDepth = depth + 1
            for (const item of v) walk(item, depth + 1)
            return
        }
        switch (typeof v) {
            case 'object': {
                s.objects++
                if (depth + 1 > s.maxDepth) s.maxDepth = depth + 1
                for (const [, child] of Object.entries(v as Record<string, unknown>)) {
                    s.keys++
                    walk(child, depth + 1)
                }
                return
            }
            case 'string':
                s.strings++
                return
            case 'number':
                s.numbers++
                return
            case 'boolean':
                s.booleans++
                return
        }
    }
    walk(value, 0)
    return s
}

// ── 구문 강조 토크나이저 ───────────────────────────────────────────────────────

export type JsonTokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punct' | 'plain'

export interface JsonToken {
    text: string
    type: JsonTokenType
}

const TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\bnull\b|([{}[\],:])/g

/** JSON.stringify 출력의 한 줄을 구문 강조용 토큰으로 분해한다. */
export function tokenizeJsonLine(line: string): JsonToken[] {
    const tokens: JsonToken[] = []
    let last = 0
    TOKEN_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = TOKEN_RE.exec(line)) !== null) {
        if (m.index > last) tokens.push({text: line.slice(last, m.index), type: 'plain'})
        if (m[1] !== undefined) {
            tokens.push({text: m[1], type: m[2] !== undefined ? 'key' : 'string'})
            if (m[2] !== undefined) tokens.push({text: m[2], type: 'punct'})
        } else if (m[3] !== undefined) {
            tokens.push({text: m[3], type: 'number'})
        } else if (m[4] !== undefined) {
            tokens.push({text: m[4], type: 'boolean'})
        } else if (m[5] !== undefined) {
            tokens.push({text: m[5], type: 'punct'})
        } else {
            tokens.push({text: m[0], type: 'null'})
        }
        last = m.index + m[0].length
    }
    if (last < line.length) tokens.push({text: line.slice(last), type: 'plain'})
    return tokens
}

// ── 라인 값 추출 (hover 복사용) ────────────────────────────────────────────────

/**
 * 포맷된 JSON의 한 줄에서 복사할 "값"을 추출한다.
 * - `"name": "홍길동",` → `홍길동` (문자열은 따옴표 제거)
 * - `"age": 30,` → `30`
 * - 키가 없는 줄은 트림 + 끝 쉼표 제거
 */
export function extractLineValue(line: string): string {
    let t = line.trim()
    if (t.endsWith(',')) t = t.slice(0, -1)
    const m = t.match(/^"(?:[^"\\]|\\.)*"\s*:\s*(.+)$/)
    if (m && m[1]) t = m[1]
    if (/^"(?:[^"\\]|\\.)*"$/.test(t)) {
        try {
            return JSON.parse(t) as string
        } catch {
            return t
        }
    }
    return t
}
