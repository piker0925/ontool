export interface SvgOptimizeOptions {
    precision: number
    removeMetadata: boolean
    keepViewBox: boolean
}

export interface SvgOptimizeResult {
    output: string
    originalBytes: number
    optimizedBytes: number
}

export class SvgParseError extends Error {
}

function byteLength(text: string): number {
    return new TextEncoder().encode(text).length
}

function removeComments(node: Node): void {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const child = node.childNodes[i]
        if (child.nodeType === Node.COMMENT_NODE) {
            node.removeChild(child)
        } else {
            removeComments(child)
        }
    }
}

function removeMetadataElements(doc: Document): void {
    doc.querySelectorAll('metadata').forEach(el => el.remove())
}

function roundNumbersInAttributes(node: Element, precision: number): void {
    for (const attr of Array.from(node.attributes)) {
        const rounded = attr.value.replace(/-?\d+\.\d+/g, match => {
            const value = Number(parseFloat(match).toFixed(precision))
            return value.toString()
        })
        if (rounded !== attr.value) {
            node.setAttribute(attr.name, rounded)
        }
    }
    for (const child of Array.from(node.children)) {
        roundNumbersInAttributes(child, precision)
    }
}

export function optimizeSvg(input: string, options: SvgOptimizeOptions): SvgOptimizeResult {
    const originalBytes = byteLength(input)

    const parser = new DOMParser()
    const doc = parser.parseFromString(input, 'image/svg+xml')

    if (doc.querySelector('parsererror')) {
        throw new SvgParseError('SVG를 파싱할 수 없습니다 — 문법이 올바른지 확인하세요.')
    }
    const root = doc.documentElement
    if (!root || root.tagName.toLowerCase() !== 'svg') {
        throw new SvgParseError('<svg> 루트 요소를 찾을 수 없습니다.')
    }

    removeComments(doc)
    if (options.removeMetadata) {
        removeMetadataElements(doc)
    }
    if (!options.keepViewBox) {
        root.removeAttribute('viewBox')
    }
    roundNumbersInAttributes(root, options.precision)

    const output = new XMLSerializer().serializeToString(doc)
    return {output, originalBytes, optimizedBytes: byteLength(output)}
}
