import {describe, expect, it} from 'vitest'
import {formatGameScore} from './gameScoreFormat'

describe('formatGameScore', () => {
    it('반응속도 게임은 저장된 ms 값을 그대로 ms 단위로 보여준다', () => {
        expect(formatGameScore('game-reaction-time', 234)).toBe('234ms')
    })

    it('지뢰찾기는 ms로 저장된 점수를 초 단위로 환산해 보여준다(1000 나눠 반올림)', () => {
        // 45500ms → 45.5초 → 반올림 46초. 단순히 "초"라는 접미사만 붙이면 안 되고
        // 실제로 1000 나눗셈이 일어났는지까지 검증한다(값 자체가 달라졌는지 확인).
        expect(formatGameScore('game-minesweeper', 45500)).toBe('46초')
        expect(formatGameScore('game-minesweeper', 3000)).toBe('3초')
    })

    it('2048·스네이크 같은 점수형 게임은 "점" 단위를 붙인다', () => {
        expect(formatGameScore('game-2048', 128)).toBe('128점')
        expect(formatGameScore('game-snake', 15)).toBe('15점')
    })

    it('121 캐주얼 게임 8종 중 점수 누적형(타워쌓기·블록블라스트·매치3·벽돌깨기·두더지잡기·장애물피하기)도 "점" 단위를 붙인다', () => {
        expect(formatGameScore('game-tower-stack', 12)).toBe('12점')
        expect(formatGameScore('game-block-blast', 340)).toBe('340점')
        expect(formatGameScore('game-match3', 90)).toBe('90점')
        expect(formatGameScore('game-breakout', 56)).toBe('56점')
        expect(formatGameScore('game-whack-a-mole', 18)).toBe('18점')
        expect(formatGameScore('game-obstacle-dodge', 240)).toBe('240점')
    })

    it('워터소트·슬라이딩퍼즐은 이동 횟수(적을수록 좋음)라 카드짝맞추기·숫자야구처럼 "번" 단위를 붙인다', () => {
        expect(formatGameScore('game-water-sort', 14)).toBe('14번')
        expect(formatGameScore('game-sliding-puzzle', 37)).toBe('37번')
    })

    it('카드짝맞추기·숫자야구는 시도 횟수(번) 단위를 쓴다', () => {
        expect(formatGameScore('game-memory-cards', 12)).toBe('12번')
        expect(formatGameScore('game-baseball', 5)).toBe('5번')
    })

    it('등록되지 않은 게임 id는 단위 없이 숫자만 반환한다', () => {
        expect(formatGameScore('game-unknown', 999)).toBe('999')
    })

    it('같은 숫자라도 게임에 따라 다른 문자열을 만든다(단위가 실제로 게임별로 분기됨을 확인)', () => {
        const forReaction = formatGameScore('game-reaction-time', 100)
        const for2048 = formatGameScore('game-2048', 100)
        expect(forReaction).not.toBe(for2048)
    })
})
