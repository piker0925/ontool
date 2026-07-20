export interface TocHeading {
    level: number
    text: string
    slug: string
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
}

export function extractHeadings(markdown: string): TocHeading[] {
    const slugCounts = new Map<string, number>()
    const headings: TocHeading[] = []
    let inFence = false

    for (const line of markdown.split('\n')) {
        if (/^\s*```/.test(line)) {
            inFence = !inFence
            continue
        }
        if (inFence) continue

        const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
        if (!match) continue

        const level = match[1].length
        const text = match[2].trim()
        const base = slugify(text)
        const count = slugCounts.get(base) ?? 0
        slugCounts.set(base, count + 1)
        const slug = count === 0 ? base : `${base}-${count}`

        headings.push({level, text, slug})
    }

    return headings
}

export function generateToc(markdown: string): string {
    return extractHeadings(markdown)
        .map(h => `${'  '.repeat(h.level - 1)}- [${h.text}](#${h.slug})`)
        .join('\n')
}
