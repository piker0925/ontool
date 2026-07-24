import {beforeEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import SnakeGame from './SnakeGame.vue'

beforeEach(() => {
    // jsdom은 canvas 2d 컨텍스트를 구현하지 않는다 — 렌더 배선 통과용 최소 스텁.
    ;(HTMLCanvasElement.prototype as unknown as { getContext: () => object }).getContext = () => ({
        clearRect: () => {},
        fillRect: () => {},
        fillStyle: '',
    })
})

describe('SnakeGame — 시작 전 대기', () => {
    it('시작 버튼을 누르기 전에는 뱀이 움직이지 않는다(플레이어가 반응할 시간 없이 벽에 부딪혀 즉사하지 않음)', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(SnakeGame)
            await vi.advanceTimersByTimeAsync(3000) // 시작 안 누른 채 3초가 지나도

            expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(false)
            expect(wrapper.find('[data-testid="snake-start"]').exists()).toBe(true)
        } finally {
            vi.useRealTimers()
        }
    })
})

describe('SnakeGame — 포커스', () => {
    it('시작 버튼을 누르면 버튼이 사라져도 방향키를 계속 받을 수 있도록 게임 영역으로 포커스가 돌아온다', async () => {
        const wrapper = mount(SnakeGame, {attachTo: document.body})
        try {
            await wrapper.find('[data-testid="snake-start"]').trigger('click')
            await nextTick()

            // 시작 버튼(포커스를 가졌던 요소)은 사라졌고, keydown을 처리하는 tabindex=0 컨테이너로
            // 포커스가 돌아와 있어야 한다 — 그렇지 않으면(예: body로 밀림) 방향키가 씹힌다.
            expect(wrapper.find('[data-testid="snake-start"]').exists()).toBe(false)
            expect(document.activeElement?.getAttribute('tabindex')).toBe('0')
        } finally {
            wrapper.unmount()
        }
    })
})

describe('SnakeGame — 입력 버퍼링(레이스 컨디션)', () => {
    // jsdom의 canvas 스텁 fillRect 호출을 가로채, 매 draw()마다 어떤 색(fillStyle)이 어느 픽셀에
    // 그려졌는지 기록한다. 머리는 항상 '#16a34a'로 그려지므로(SnakeBoard.vue의 draw() 참고),
    // 컴포넌트 내부 상태를 노출하지 않고도 틱마다 머리가 실제로 어느 방향으로 움직였는지 관찰할 수 있다.
    function stubCanvasWithDrawCapture() {
        const drawCalls: { style: string; x: number; y: number }[] = []
        const ctxStub = {
            fillStyle: '',
            clearRect() {
                drawCalls.length = 0
            },
            fillRect(x: number, y: number) {
                drawCalls.push({style: ctxStub.fillStyle, x, y})
            },
        }
        ;(HTMLCanvasElement.prototype as unknown as { getContext: () => object }).getContext = () => ctxStub
        return {
            headPosition(): { x: number; y: number } {
                const head = drawCalls.find(c => c.style === '#16a34a')
                if (!head) throw new Error('머리가 그려지지 않았다 — 캡처 타이밍 확인 필요')
                return {x: head.x, y: head.y}
            },
        }
    }

    it('오른쪽 이동 중 한 틱 안에 아래→왼쪽을 연속으로 누르면, 두 방향 다 버려지지 않고 순서대로 각각 다음 틱에 적용된다', async () => {
        const {headPosition} = stubCanvasWithDrawCapture()
        vi.useFakeTimers()
        try {
            const wrapper = mount(SnakeGame, {attachTo: document.body})
            await wrapper.find('[data-testid="snake-start"]').trigger('click')

            await vi.advanceTimersByTimeAsync(150) // 자연스러운 첫 틱(오른쪽 이동) 이후 기준 위치 확보
            const p0 = headPosition()

            // 한 틱이 지나기 전에 아래 → 왼쪽을 빠르게 연타(레이스 컨디션 재현 조건)
            await wrapper.find('div[tabindex="0"]').trigger('keydown', {key: 'ArrowDown'})
            await wrapper.find('div[tabindex="0"]').trigger('keydown', {key: 'ArrowLeft'})

            await vi.advanceTimersByTimeAsync(150) // 다음 틱 — 버퍼링되면 'down'이 먼저 적용되어야 함
            const p1 = headPosition()
            expect(p1.y).toBeGreaterThan(p0.y) // 아래로 한 칸 이동
            expect(p1.x).toBe(p0.x) // 이 틱에서는 좌우로 움직이지 않음

            await vi.advanceTimersByTimeAsync(150) // 그다음 틱 — 이제 'left'가 적용되어야 함
            const p2 = headPosition()
            expect(p2.x).toBeLessThan(p1.x) // 왼쪽으로 한 칸 이동
            expect(p2.y).toBe(p1.y)

            expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(false)
        } finally {
            vi.useRealTimers()
        }
    })

    it('느긋하게 한 틱에 한 번씩 방향을 바꾸는 정상 플레이는 회귀 없이 즉시 반영된다', async () => {
        const {headPosition} = stubCanvasWithDrawCapture()
        vi.useFakeTimers()
        try {
            const wrapper = mount(SnakeGame, {attachTo: document.body})
            await wrapper.find('[data-testid="snake-start"]').trigger('click')

            await vi.advanceTimersByTimeAsync(150)
            const p0 = headPosition()

            await wrapper.find('div[tabindex="0"]').trigger('keydown', {key: 'ArrowDown'})
            await vi.advanceTimersByTimeAsync(150)
            const p1 = headPosition()
            expect(p1.y).toBeGreaterThan(p0.y)
            expect(p1.x).toBe(p0.x)

            await wrapper.find('div[tabindex="0"]').trigger('keydown', {key: 'ArrowRight'})
            await vi.advanceTimersByTimeAsync(150)
            const p2 = headPosition()
            expect(p2.x).toBeGreaterThan(p1.x)
            expect(p2.y).toBe(p1.y)

            expect(wrapper.find('[data-testid="game-over"]').exists()).toBe(false)
        } finally {
            vi.useRealTimers()
        }
    })
})

describe('SnakeGame — 재시작', () => {
    it('몇 틱 진행한 뒤 다시 시작하면 뱀이 초기 위치·점수로 되돌아간다(시작 전 대기 상태)', async () => {
        vi.useFakeTimers()
        try {
            const wrapper = mount(SnakeGame)
            await wrapper.find('[data-testid="snake-start"]').trigger('click')
            await vi.advanceTimersByTimeAsync(600) // TICK_MS(150) 여러 번 지나 머리가 움직임

            await wrapper.find('[data-testid="game-restart"]').trigger('click')

            expect(wrapper.find('[data-testid="score"]').text()).toBe('0')
            expect(wrapper.find('[data-testid="snake-start"]').exists()).toBe(true)
        } finally {
            vi.useRealTimers()
        }
    })
})
