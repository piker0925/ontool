export type ColumnAlign = 'left' | 'center' | 'right'

const ALIGN_MARKER: Record<ColumnAlign, string> = {
    left: ':--',
    center: ':-:',
    right: '--:',
}

export function parseCsv(csv: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let inQuotes = false
    const text = csv.trim().replace(/\r\n/g, '\n')

    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') {
                field += '"'
                i++
            } else if (ch === '"') {
                inQuotes = false
            } else {
                field += ch
            }
        } else if (ch === '"') {
            inQuotes = true
        } else if (ch === ',') {
            row.push(field.trim())
            field = ''
        } else if (ch === '\n') {
            row.push(field.trim())
            rows.push(row)
            row = []
            field = ''
        } else {
            field += ch
        }
    }
    row.push(field.trim())
    rows.push(row)

    return rows
}

function escapeCell(cell: string): string {
    return cell.replace(/\|/g, '\\|')
}

function unescapeCell(cell: string): string {
    return cell.replace(/\\\|/g, '|')
}

export function buildMarkdownTable(rows: string[][], alignments: ColumnAlign[] = []): string {
    if (rows.length === 0) return ''

    const columnCount = rows[0].length
    const aligns = Array.from({length: columnCount}, (_, i) => alignments[i] ?? 'left')

    const header = `| ${rows[0].map(escapeCell).join(' | ')} |`
    const separator = `| ${aligns.map(a => ALIGN_MARKER[a]).join(' | ')} |`
    const body = rows.slice(1).map(row => `| ${row.map(escapeCell).join(' | ')} |`)

    return [header, separator, ...body].join('\n')
}

function splitTableRow(line: string): string[] {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '')
        .split(/(?<!\\)\|/)
        .map(cell => unescapeCell(cell.trim()))
}

function isSeparatorRow(cells: string[]): boolean {
    return cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c))
}

export function parseMarkdownTable(markdown: string): string[][] {
    return markdown
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(splitTableRow)
        .filter(cells => !isSeparatorRow(cells))
}
