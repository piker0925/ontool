import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import IdleClickerGame from './IdleClickerGame.vue'

describe('IdleClickerGame', () => {
    it('클릭 버튼을 누르면 코인이 클릭당 획득량만큼 늘어난다', async () => {
        const wrapper = mount(IdleClickerGame)
        expect(wrapper.find('[data-testid="coins"]').text()).toBe('0')

        await wrapper.find('[data-testid="click-button"]').trigger('click')
        expect(wrapper.find('[data-testid="coins"]').text()).toBe('1')

        await wrapper.find('[data-testid="click-button"]').trigger('click')
        expect(wrapper.find('[data-testid="coins"]').text()).toBe('2')
    })

    it('코인이 부족하면 업그레이드 버튼이 비활성화된다', () => {
        const wrapper = mount(IdleClickerGame)
        const button = wrapper.find('[data-testid="buy-click-upgrade"]')
        expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('충분히 클릭해 코인을 모으면 업그레이드를 살 수 있고, 이후 클릭당 획득량이 늘어난다', async () => {
        const wrapper = mount(IdleClickerGame)
        for (let i = 0; i < 10; i++) {
            await wrapper.find('[data-testid="click-button"]').trigger('click')
        }
        expect(wrapper.find('[data-testid="coins"]').text()).toBe('10')

        const upgradeButton = wrapper.find('[data-testid="buy-click-upgrade"]')
        expect((upgradeButton.element as HTMLButtonElement).disabled).toBe(false)
        await upgradeButton.trigger('click')

        expect(wrapper.find('[data-testid="coins"]').text()).toBe('0')
        await wrapper.find('[data-testid="click-button"]').trigger('click')
        expect(wrapper.find('[data-testid="coins"]').text()).toBe('2')
    })
})
