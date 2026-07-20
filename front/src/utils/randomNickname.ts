import {ADJECTIVES, NOUNS} from '../data/nicknameWords'

/** 형용사+명사 조합으로 무작위 한국어 닉네임을 생성한다. */
export function generateNickname(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
    return `${adj} ${noun}`
}
