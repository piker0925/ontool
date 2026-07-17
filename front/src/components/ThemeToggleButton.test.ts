import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {ref} from 'vue'
import ThemeToggleButton from './ThemeToggleButton.vue'

const setTheme = vi.fn()
const preference = ref<'light' | 'dark' | 'system'>('system')
vi.mock('../composables/useTheme', () => ({
    useTheme: () => ({preference, isDark: ref(false), setTheme}),
}))

describe('ThemeToggleButton', () => {
    it('현재 테마를 aria-label/title에 반영한다', () => {
        preference.value = 'dark'
        const wrapper = mount(ThemeToggleButton)

        const button = wrapper.find('button')
        expect(button.attributes('aria-label')).toContain('다크 테마')
        expect(button.attributes('title')).toContain('다크 테마')
    })

    it('buttonClass prop을 버튼에 그대로 적용한다', () => {
        const wrapper = mount(ThemeToggleButton, {props: {buttonClass: 'text-sidebar-foreground'}})

        expect(wrapper.find('button').classes()).toContain('text-sidebar-foreground')
    })
})
