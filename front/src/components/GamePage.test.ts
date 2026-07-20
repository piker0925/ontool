import {describe, expect, it} from 'vitest'
import {mount} from '@vue/test-utils'
import {defineComponent, ref} from 'vue'
import GamePage from './GamePage.vue'

// 게임 내부 상태를 흉내내는 스텁: 버튼을 누르면 count가 증가한다.
// GamePage가 재시작 시 slot 콘텐츠를 완전히 새로 마운트하는지(=상태 초기화) 확인하는 데 쓴다.
const StubGame = defineComponent({
    setup() {
        const count = ref(0)
        return {count}
    },
    template: `<button data-testid="bump" @click="count++">{{ count }}</button>`,
})

describe('GamePage', () => {
    it('title과 description을 렌더링한다', () => {
        const wrapper = mount(GamePage, {props: {title: '2048', description: '타일을 합쳐보세요'}})
        expect(wrapper.text()).toContain('2048')
        expect(wrapper.text()).toContain('타일을 합쳐보세요')
    })

    it('다시 시작 버튼을 누르면 slot 콘텐츠가 완전히 새로 마운트되어 내부 상태가 초기화된다', async () => {
        const wrapper = mount(GamePage, {
            props: {title: '테스트 게임'},
            slots: {default: StubGame},
        })

        await wrapper.find('[data-testid="bump"]').trigger('click')
        await wrapper.find('[data-testid="bump"]').trigger('click')
        expect(wrapper.find('[data-testid="bump"]').text()).toBe('2')

        await wrapper.find('[data-testid="game-restart"]').trigger('click')

        expect(wrapper.find('[data-testid="bump"]').text()).toBe('0')
    })
})
