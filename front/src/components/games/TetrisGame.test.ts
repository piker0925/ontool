import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import TetrisGame from './TetrisGame.vue'

describe('TetrisGame', () => {
    it('초기 마운트 시 테트리스 싱글 보드가 표시되고 대결 모드 토글 버튼이 존재한다', () => {
        const wrapper = mount(TetrisGame)
        expect(wrapper.find('[data-testid="tetris-mode-toggle"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="tetris-board"]').exists()).toBe(true)
    })

    it('대결 모드 토글을 클릭하면 5인 대결 로비로 전환된다', async () => {
        const wrapper = mount(TetrisGame)
        const toggleBtn = wrapper.find('[data-testid="tetris-mode-toggle"]')
        await toggleBtn.trigger('click')

        expect(wrapper.find('[data-testid="tetris-create"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="tetris-room-empty"]').exists()).toBe(true)
    })
})
