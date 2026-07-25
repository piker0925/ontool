import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import SlidingPuzzleGame from './SlidingPuzzleGame.vue'

describe('SlidingPuzzleGame', () => {
    it('마운트 시 4x4 보드(16칸)를 렌더링하고 아직 완성 상태가 아니다', () => {
        const wrapper = mount(SlidingPuzzleGame)
        expect(wrapper.findAll('[data-testid^="tile-"]').length).toBe(16)
        expect(wrapper.find('[data-testid="game-clear"]').exists()).toBe(false)
    })

    it('빈칸과 인접하지 않은 타일을 눌러도 이동 횟수가 늘지 않지만, 인접한 타일을 누르면 정확히 1 늘어난다', async () => {
        const wrapper = mount(SlidingPuzzleGame)
        const tiles = wrapper.findAll('[data-testid^="tile-"]')
        const blankIndex = tiles.findIndex(t => t.text() === '')
        const blankRow = Math.floor(blankIndex / 4)
        const blankCol = blankIndex % 4

        // 대각선 반대쪽 모서리 칸은 항상 인접하지 않다(행·열 차이가 모두 3 이하인 4x4에서,
        // 빈칸 위치와 상관없이 존재하는 칸 중 확실히 비인접한 칸을 계산으로 찾는다).
        const farIndex = tiles.findIndex((t, i) => {
            const row = Math.floor(i / 4)
            const col = i % 4
            return Math.abs(row - blankRow) + Math.abs(col - blankCol) > 1 && t.text() !== ''
        })
        await tiles[farIndex].trigger('click')
        expect(wrapper.find('[data-testid="move-count"]').text()).toBe('0')

        const adjacentIndex = tiles.findIndex((_t, i) => {
            const row = Math.floor(i / 4)
            const col = i % 4
            return Math.abs(row - blankRow) + Math.abs(col - blankCol) === 1
        })
        await tiles[adjacentIndex].trigger('click')
        expect(wrapper.find('[data-testid="move-count"]').text()).toBe('1')
    })
})
