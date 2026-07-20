import type {WordFrequency} from './textFrequency'

export type WordcloudColorTier = 'high' | 'mid' | 'low'

export interface WordcloudItem {
    word: string
    count: number
    fontSize: number
    x: number
    y: number
    colorTier: WordcloudColorTier
}

const MIN_FONT = 14
const MAX_FONT = 64
// 상위 N개로 제한한다 — 무제한으로 배치하면 캔버스 안에서 서로 겹쳐 결국 다 안 보이게 된다.
const MAX_WORDS = 80

function colorTierOf(rank: number, total: number): WordcloudColorTier {
    const ratio = total <= 1 ? 0 : rank / (total - 1)
    if (ratio < 1 / 3) return 'high'
    if (ratio < 2 / 3) return 'mid'
    return 'low'
}

interface Box {
    left: number
    right: number
    top: number
    bottom: number
}

function boxAt(x: number, y: number, halfW: number, halfH: number): Box {
    return {left: x - halfW, right: x + halfW, top: y - halfH, bottom: y + halfH}
}

function overlaps(a: Box, b: Box): boolean {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

/** 빈도 비례 폰트 크기로 단어들을 배치한다. 아르키메데스 나선을 따라가며 겹치지 않는 첫 위치를 찾는다. */
export function layoutWordcloud(frequencies: WordFrequency[], width: number, height: number): WordcloudItem[] {
    const top = frequencies.slice(0, MAX_WORDS)
    if (top.length === 0) return []

    const counts = top.map(f => f.count)
    const maxCount = Math.max(...counts)
    const minCount = Math.min(...counts)
    const range = maxCount - minCount

    const centerX = width / 2
    const centerY = height / 2
    const placed: Box[] = []

    return top.map((f, i) => {
        const ratio = range === 0 ? 1 : (f.count - minCount) / range
        const fontSize = Math.round(MIN_FONT + ratio * (MAX_FONT - MIN_FONT))
        const halfW = f.word.length * fontSize * 0.55
        const halfH = fontSize * 0.6

        let angle = i * 0.9
        let radius = 0
        let x = centerX
        let y = centerY
        for (let attempt = 0; attempt < 800; attempt++) {
            x = centerX + radius * Math.cos(angle)
            y = centerY + radius * Math.sin(angle)
            const box = boxAt(x, y, halfW, halfH)
            const withinBounds = box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= height
            if (withinBounds && !placed.some(p => overlaps(p, box))) break
            angle += 0.5
            radius += 2.2
        }

        placed.push(boxAt(x, y, halfW, halfH))
        return {
            word: f.word,
            count: f.count,
            fontSize,
            x,
            y,
            colorTier: colorTierOf(i, top.length),
        }
    })
}
