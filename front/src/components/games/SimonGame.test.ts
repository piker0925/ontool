import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import SimonGame from './SimonGame.vue'

describe('SimonGame — 재시작', () => {
    it('플레이 중 다시 시작하면 idle 상태(시작 버튼)의 라운드 1로 되돌아간다', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(SimonGame)
            await wrapper.find('[data-testid="simon-start"]').trigger('click')
            // 172: 1라운드는 속도 스케줄상 기본 속도보다 느리게(showMs+gapMs≈1450ms) 재생되므로
            // 넉넉히 대기한다 — 시퀀스 재생 끝 → input 단계
            await vi.advanceTimersByTimeAsync(1600)
            await wrapper.find('[data-testid="simon-color-0"]').trigger('click') // 정답이든 오답이든 상태가 idle을 벗어남

            expect(wrapper.find('[data-testid="simon-start"]').exists()).toBe(false)

            await wrapper.find('[data-testid="game-restart"]').trigger('click')

            expect(wrapper.find('[data-testid="simon-start"]').exists()).toBe(true)
            expect(wrapper.find('[data-testid="round"]').text()).toBe('1')
        } finally {
            vi.useRealTimers()
        }
    })
})

describe('SimonGame — 완화 구간에서도 라운드 클리어가 정상 반영된다(172)', () => {
    it('시퀀스 길이가 그대로인 라운드를 클리어해도 게임오버가 아니라 라운드가 올라가고 시퀀스가 다시 재생된다', async () => {
        vi.useFakeTimers()
        // Math.random을 0으로 고정 — 매 색이 항상 index 0으로 뽑혀 정답을 예측 가능하게 만든다.
        // (colorCount=9 기준으로도 floor(0*9)=0이라 시퀀스는 항상 [0, 0, 0, ...])
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
        try {
            const wrapper = mount(SimonGame)
            await wrapper.find('[data-testid="simon-start"]').trigger('click')

            // 라운드 1(완화 구간, colorCount=9 기준 showMs=1000+gapMs=450=1450ms) 재생 종료까지 대기
            await vi.advanceTimersByTimeAsync(1500)
            expect(wrapper.find('[data-testid="round"]').text()).toBe('1')

            // 정답(색 0)을 눌러 라운드 1을 클리어 — 완화 스케줄(172)상 라운드 1→2는
            // 시퀀스 길이가 늘지 않는 구간이다. 그래도 게임오버가 아니라 라운드가 올라가고
            // 시퀀스가 다시 재생돼야 한다(round 기준으로 판정하도록 고친 SimonBoard 로직 검증)
            await wrapper.find('[data-testid="simon-color-0"]').trigger('click')

            expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(false)
            expect(wrapper.find('[data-testid="round"]').text()).toBe('2')
            // 재생(showing) 단계로 들어가 입력 버튼이 다시 비활성화된다 — 시퀀스 길이가
            // 안 늘었어도 재생이 실제로 다시 일어남을 보여준다
            expect(wrapper.find('[data-testid="simon-color-0"]').attributes('disabled')).toBeDefined()

            // 라운드 2 재생 타이밍만큼 대기하면 다시 입력 가능(input) 상태로 돌아온다
            await vi.advanceTimersByTimeAsync(1500)
            expect(wrapper.find('[data-testid="simon-color-0"]').attributes('disabled')).toBeUndefined()
        } finally {
            randomSpy.mockRestore()
            vi.useRealTimers()
        }
    })
})
