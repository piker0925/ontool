import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import Game2048 from './Game2048.vue'

describe('Game2048 — 재시작', () => {
    it('다시 시작 버튼을 누르면 점수와 보드가 초기 상태로 되돌아간다', async () => {
        const wrapper = mount(Game2048)
        const board = wrapper.find('[data-testid="board"]')

        // 방향키로 몇 번 이동시켜 점수/보드를 초기 상태에서 벗어나게 만든다.
        for (let i = 0; i < 6; i++) {
            await board.trigger('keydown', {key: 'ArrowLeft'})
            await board.trigger('keydown', {key: 'ArrowUp'})
            await board.trigger('keydown', {key: 'ArrowRight'})
            await board.trigger('keydown', {key: 'ArrowDown'})
        }

        const scoreBeforeRestart = wrapper.find('[data-testid="score"]').text()

        await wrapper.find('[data-testid="game-restart"]').trigger('click')

        const tilesAfterRestart = wrapper.findAll('[data-testid="board"] > *')
            .map(c => c.text()).filter(Boolean)

        expect(wrapper.find('[data-testid="score"]').text()).toBe('0')
        expect(tilesAfterRestart.length).toBe(2) // 새 게임은 항상 타일 2개로 시작
        // 재시작 전후로 점수가 실제로 달라졌는지도 확인 (움직임 자체가 무효화되지 않았는지)
        expect(scoreBeforeRestart).not.toBe('0')
    })
})
