import {afterEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import NumberBaseballGame from './NumberBaseballGame.vue'

describe('NumberBaseballGame — 재시작', () => {
    it('추측을 한 번 제출한 뒤 다시 시작하면 기록이 비워진 새 게임으로 돌아간다', async () => {
        const wrapper = mount(NumberBaseballGame)

        await wrapper.find('[data-testid="guess-input"]').setValue('012')
        await wrapper.find('form').trigger('submit')

        expect(wrapper.findAll('[data-testid="history"] > li').length).toBe(1)

        await wrapper.find('[data-testid="game-restart"]').trigger('click')

        expect(wrapper.findAll('[data-testid="history"] > li').length).toBe(0)
    })
})

describe('NumberBaseballGame — 166: 승리 메시지 옆 재시작 버튼', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('GameResultOverlay를 안 쓰는 리스트형 예외 게임에도 재시작 버튼이 승리 메시지 옆에 나타나고, 클릭하면 기록이 초기화된다', async () => {
        // Fisher-Yates 셔플에서 random()이 항상 0을 반환하면 생성되는 secret은 항상 [1,2,3] —
        // numberBaseball.ts의 셔플 로직으로 직접 검증된 값(회귀 시 이 테스트가 먼저 깨짐).
        vi.spyOn(Math, 'random').mockReturnValue(0)
        const wrapper = mount(NumberBaseballGame)

        await wrapper.find('[data-testid="guess-input"]').setValue('123')
        await wrapper.find('form').trigger('submit')

        expect(wrapper.find('[data-testid="win-message"]').exists()).toBe(true)
        const restartButton = wrapper.find('[data-testid="game-result-restart"]')
        expect(restartButton.exists()).toBe(true)

        await restartButton.trigger('click')

        expect(wrapper.find('[data-testid="win-message"]').exists()).toBe(false)
        expect(wrapper.findAll('[data-testid="history"] > li').length).toBe(0)
    })
})
