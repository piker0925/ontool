export interface ParsedCurlRequest {
    url: string
    method: string
    headers: Record<string, string>
    body: string | null
}

function tokenize(command: string): string[] {
    const tokens: string[] = []
    let current = ''
    let quote: '"' | '\'' | null = null
    for (let i = 0; i < command.length; i++) {
        const ch = command[i]
        if (quote) {
            if (ch === quote) {
                quote = null
            } else {
                current += ch
            }
            continue
        }
        if (ch === '"' || ch === '\'') {
            quote = ch
            continue
        }
        if (/\s/.test(ch)) {
            if (current) {
                tokens.push(current)
                current = ''
            }
            continue
        }
        current += ch
    }
    if (current) tokens.push(current)
    return tokens
}

export function parseCurl(command: string): ParsedCurlRequest {
    const tokens = tokenize(command.trim()).filter(t => t !== 'curl')

    let url = ''
    let method = ''
    const headers: Record<string, string> = {}
    let body: string | null = null

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        if (token === '-X' || token === '--request') {
            method = tokens[++i] ?? ''
        } else if (token === '-H' || token === '--header') {
            const header = tokens[++i] ?? ''
            const sep = header.indexOf(':')
            if (sep !== -1) {
                headers[header.slice(0, sep).trim()] = header.slice(sep + 1).trim()
            }
        } else if (token === '-d' || token === '--data' || token === '--data-raw') {
            body = tokens[++i] ?? ''
        } else if (!token.startsWith('-')) {
            url = token
        }
    }

    if (!method) {
        method = body !== null ? 'POST' : 'GET'
    }

    return {url, method: method.toUpperCase(), headers, body}
}

export function generateJsFetch(request: ParsedCurlRequest): string {
    const lines = [`fetch(${JSON.stringify(request.url)}, {`]
    lines.push(`  method: ${JSON.stringify(request.method)},`)
    const headerEntries = Object.entries(request.headers)
    if (headerEntries.length > 0) {
        lines.push('  headers: {')
        lines.push(headerEntries.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n'))
        lines.push('  },')
    }
    if (request.body !== null) {
        lines.push(`  body: ${JSON.stringify(request.body)},`)
    }
    lines.push('})')
    return lines.join('\n')
}

export function generatePythonRequests(request: ParsedCurlRequest): string {
    const lines: string[] = []
    const headerEntries = Object.entries(request.headers)
    if (headerEntries.length > 0) {
        lines.push('headers = {')
        lines.push(headerEntries.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n'))
        lines.push('}')
    }
    const args = [JSON.stringify(request.url)]
    if (headerEntries.length > 0) args.push('headers=headers')
    if (request.body !== null) args.push(`data=${JSON.stringify(request.body)}`)
    lines.push(`response = requests.${request.method.toLowerCase()}(${args.join(', ')})`)
    return lines.join('\n')
}
