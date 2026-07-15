// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortedReplacer(_key: string, value: any): any {
    if (value && typeof value === 'object' && !Array.isArray(value))
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
    return value
}

export function formatJson(input: string, indent: number | string = 2, sortKeys = false): string {
    return JSON.stringify(JSON.parse(input), sortKeys ? sortedReplacer : undefined, indent)
}

export function minifyJson(input: string, sortKeys = false): string {
    return JSON.stringify(JSON.parse(input), sortKeys ? sortedReplacer : undefined)
}
