import {describe, expect, it} from 'vitest'
import {layoutWordcloud} from './wordcloudLayout'

describe('layoutWordcloud', () => {
    it('빈도가 가장 높은 단어가 가장 큰 폰트 크기로 배치된다', () => {
        const frequencies = [
            {word: '사과', count: 10},
            {word: '바나나', count: 4},
            {word: '포도', count: 1},
        ]
        const items = layoutWordcloud(frequencies, 600, 400)
        const apple = items.find(i => i.word === '사과')!
        const maxFontSize = Math.max(...items.map(i => i.fontSize))
        expect(apple.fontSize).toBe(maxFontSize)
    })

    it('폰트 크기는 빈도와 무관하게 랜덤이 아니라 빈도에 비례한다 (빈도가 높을수록 크기도 크거나 같다)', () => {
        const frequencies = [
            {word: 'a', count: 20},
            {word: 'b', count: 10},
            {word: 'c', count: 5},
            {word: 'd', count: 1},
        ]
        const items = layoutWordcloud(frequencies, 600, 400)
        const byWord = new Map(items.map(i => [i.word, i.fontSize]))
        expect(byWord.get('a')!).toBeGreaterThanOrEqual(byWord.get('b')!)
        expect(byWord.get('b')!).toBeGreaterThanOrEqual(byWord.get('c')!)
        expect(byWord.get('c')!).toBeGreaterThanOrEqual(byWord.get('d')!)
    })

    it('모든 단어에 대해 배치 아이템을 하나씩 반환한다', () => {
        const frequencies = [{word: '사과', count: 3}, {word: '바나나', count: 2}]
        const items = layoutWordcloud(frequencies, 600, 400)
        expect(items).toHaveLength(2)
    })

    it('단어가 많아도 서로 겹치지 않게 배치된다 (텍스트 상자 기준)', () => {
        const words = ['사과', '바나나', '포도', '딸기', '수박', '참외', '자두', '복숭아', '망고', '키위',
            '오렌지', '레몬', '체리', '멜론', '석류', '무화과', '살구', '자몽', '두리안', '파인애플']
        const frequencies = words.map((word, i) => ({word, count: words.length - i}))
        const items = layoutWordcloud(frequencies, 700, 420)

        function boxOf(item: typeof items[number]) {
            const halfW = (item.word.length * item.fontSize * 0.55)
            const halfH = item.fontSize * 0.6
            return {left: item.x - halfW, right: item.x + halfW, top: item.y - halfH, bottom: item.y + halfH}
        }

        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const a = boxOf(items[i])
                const b = boxOf(items[j])
                const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
                expect(overlaps, `"${items[i].word}"와 "${items[j].word}"가 겹침`).toBe(false)
            }
        }
    })

    it('상위 빈도 단어와 하위 빈도 단어는 색상 등급(colorTier)이 다르다 (시각적으로 구분 가능해야 함)', () => {
        const frequencies = Array.from({length: 12}, (_, i) => ({word: `단어${i}`, count: 12 - i}))
        const items = layoutWordcloud(frequencies, 700, 420)
        const topTier = items[0].colorTier
        const bottomTier = items[items.length - 1].colorTier
        expect(topTier).not.toBe(bottomTier)
    })

    it('단어 수가 너무 많으면 상위 N개까지만 배치한다 (전부 겹쳐 안 보이는 것을 방지)', () => {
        const frequencies = Array.from({length: 200}, (_, i) => ({word: `단어${i}`, count: 200 - i}))
        const items = layoutWordcloud(frequencies, 700, 420)
        expect(items.length).toBeLessThanOrEqual(80)
        expect(items[0].word).toBe('단어0')
    })
})
