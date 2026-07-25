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

    it('음소거 토글을 누르면 상태가 뒤집히고 localStorage에 저장되어 새 마운트에도 유지된다', async () => {
        localStorage.removeItem('devtoolbox-game-sound-muted')
        const wrapper = mount(GamePage, {props: {title: '테스트 게임'}})
        const toggle = wrapper.find('[data-testid="game-mute-toggle"]')
        const initialPressed = toggle.attributes('aria-pressed')

        await toggle.trigger('click')

        expect(toggle.attributes('aria-pressed')).not.toBe(initialPressed)
        expect(localStorage.getItem('devtoolbox-game-sound-muted')).toBe(
            toggle.attributes('aria-pressed') === 'true' ? '1' : '0',
        )

        // 새로 마운트해도(다른 게임 페이지로 이동한 상황을 흉내) 같은 음소거 상태가 유지된다 —
        // useGameSound가 useTheme.ts와 같은 모듈 스코프 싱글턴이기 때문.
        const secondWrapper = mount(GamePage, {props: {title: '다른 게임'}})
        expect(secondWrapper.find('[data-testid="game-mute-toggle"]').attributes('aria-pressed'))
            .toBe(toggle.attributes('aria-pressed'))

        // 원래 상태로 복구해 다른 테스트 파일에 영향을 주지 않는다.
        await toggle.trigger('click')
        localStorage.removeItem('devtoolbox-game-sound-muted')
    })
})
