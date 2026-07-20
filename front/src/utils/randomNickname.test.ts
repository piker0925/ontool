import {describe, expect, it} from 'vitest'
import {ADJECTIVES, NOUNS} from '../data/nicknameWords'
import {generateNickname} from './randomNickname'

describe('generateNickname', () => {
    it('형용사와 명사 목록에서 하나씩 뽑아 조합한다', () => {
        const nickname = generateNickname()
        const [adj, noun] = nickname.split(' ')
        expect(ADJECTIVES).toContain(adj)
        expect(NOUNS).toContain(noun)
    })

    it('단어 목록 조합 수가 충분히 커서 20개 연속 생성해도 완전히 동일한 조합이 반복될 확률이 낮다', () => {
        // 생일 문제 근사: 조합 수 n에서 k=20번 뽑을 때 충돌 확률 ≈ k(k-1)/(2n). 5% 미만이 되려면 n >= 3800.
        expect(ADJECTIVES.length * NOUNS.length).toBeGreaterThanOrEqual(3800)
    })

    it('연속 생성 5개가 전부 동일한 조합만 나오지는 않는다', () => {
        const nicknames = Array.from({length: 5}, () => generateNickname())
        expect(new Set(nicknames).size).toBeGreaterThan(1)
    })
})
