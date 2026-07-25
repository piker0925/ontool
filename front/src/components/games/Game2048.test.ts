import {afterEach, describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import Game2048 from './Game2048.vue'
import {addRandomTile, createEmptyBoard} from '../../utils/game2048'

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

describe('Game2048 — 빈 칸 그리드', () => {
    it('타일이 없는 칸도 항상 옅은 배경 사각형으로 보인다(투명이 아님)', async () => {
        const wrapper = mount(Game2048)
        await nextTick() // onMounted에서 놓는 초기 타일 2개가 DOM에 반영되도록 플러시
        const cells = wrapper.findAll('[data-testid="board"] > *')

        expect(cells.length).toBe(16) // 4x4 칸이 항상 전부 렌더링됨
        const emptyCells = cells.filter(c => c.text() === '')
        expect(emptyCells.length).toBeGreaterThan(0) // 시작 시 타일 2개뿐이므로 빈 칸이 존재

        emptyCells.forEach(c => {
            // 배경 전체(bg-muted/60)와 구분되는 옅은 사각형이어야 하며, 완전 투명이면 안 됨
            expect(c.classes()).not.toContain('bg-transparent')
        })
    })
})

describe('Game2048 — 모바일 스와이프', () => {
    // Math.random()을 큐에서 순서대로 소비시켜 타일 배치를 결정론적으로 만든다.
    // 큐가 비면 이후 호출(스와이프 이후 새로 추가되는 랜덤 타일 등)은 0.5를 반환한다 —
    // 검증 대상이 아닌 무작위 배치이므로 어떤 값이든 상관없다.
    function mockRandomQueue(values: number[]) {
        const queue = [...values]
        return vi.spyOn(Math, 'random').mockImplementation(() => queue.length ? queue.shift()! : 0.5)
    }

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('왼쪽으로 스와이프하면 오른쪽 방향키가 아니라 왼쪽 방향키와 동일하게 타일이 왼쪽으로 압축된다', async () => {
        // createEmptyBoard(4)의 빈 칸은 행 우선(0~15) 순서로 채워진다.
        // idx=4 → (1,0)에 값 2, idx=7(15칸 중 6번째, (1,0) 제외) → (1,3)에 값 4를 배치.
        mockRandomQueue([
            0.26, 0.5,  // 1번째 타일: index=floor(0.26*16)=4 → (1,0), value=2
            0.4, 0.95,  // 2번째 타일: index=floor(0.4*15)=6 → 남은 칸 중 6번째=(1,3), value=4
        ])

        const wrapper = mount(Game2048)
        const board = wrapper.find('[data-testid="board"]')

        // 왼쪽 스와이프: 오른쪽에서 왼쪽으로 손가락 이동 (dx < 0)
        await board.trigger('touchstart', {touches: [{clientX: 200, clientY: 200}]})
        await board.trigger('touchend', {changedTouches: [{clientX: 100, clientY: 200}]})

        const cells = wrapper.findAll('[data-testid="board"] > *').map(c => c.text())
        // 1행(index 4~7)이 왼쪽으로 압축되어 [2, 4, _, _] 형태가 되어야 함 (병합 없음, 2≠4)
        expect(cells[4]).toBe('2')
        expect(cells[5]).toBe('4')
    })

    it('위로 스와이프하면 아래 방향키가 아니라 위 방향키와 동일하게 타일이 위로 압축된다', async () => {
        // idx=4 → (1,0)에 값 2, idx=11(15칸 중 11번째) → (3,0)에 값 4를 배치.
        mockRandomQueue([
            0.26, 0.5,  // 1번째 타일: index=floor(0.26*16)=4 → (1,0), value=2
            0.75, 0.95, // 2번째 타일: index=floor(0.75*15)=11 → 남은 칸 중 11번째=(3,0), value=4
        ])

        const wrapper = mount(Game2048)
        const board = wrapper.find('[data-testid="board"]')

        // 위쪽 스와이프: 아래에서 위로 손가락 이동 (dy < 0)
        await board.trigger('touchstart', {touches: [{clientX: 200, clientY: 200}]})
        await board.trigger('touchend', {changedTouches: [{clientX: 200, clientY: 100}]})

        const cells = wrapper.findAll('[data-testid="board"] > *').map(c => c.text())
        // 0열이 위로 압축되어 (0,0)=2, (1,0)=4가 되어야 함 (병합 없음, 2≠4)
        expect(cells[0]).toBe('2')
        expect(cells[4]).toBe('4')
    })

    it('20px 미만의 짧은 터치(탭)는 스와이프로 인식하지 않아 보드가 변하지 않는다', async () => {
        mockRandomQueue([0.26, 0.5, 0.4, 0.95])

        const wrapper = mount(Game2048)
        const board = wrapper.find('[data-testid="board"]')
        await nextTick() // onMounted에서 놓는 초기 타일 2개가 DOM에 반영되도록 플러시
        const before = wrapper.findAll('[data-testid="board"] > *').map(c => c.text())

        await board.trigger('touchstart', {touches: [{clientX: 200, clientY: 200}]})
        await board.trigger('touchend', {changedTouches: [{clientX: 205, clientY: 202}]}) // 5~10px 이동

        const after = wrapper.findAll('[data-testid="board"] > *').map(c => c.text())
        expect(after).toEqual(before)
        expect(wrapper.find('[data-testid="score"]').text()).toBe('0')
    })
})

// game2048.ts 유틸을 직접 import 해 위 스와이프 테스트의 인덱스 계산 전제가 맞는지 별도로 검증.
// (테스트 자체가 잘못된 인덱스 math로 우연히 통과하는 것을 막기 위한 자기 점검)
describe('Game2048 — 스와이프 테스트 전제 검증', () => {
    it('mockRandomQueue로 만든 시퀀스가 실제로 의도한 좌표에 타일을 놓는다', () => {
        const queue = [0.26, 0.5, 0.4, 0.95]
        const random = () => queue.shift()!
        const b = addRandomTile(addRandomTile(createEmptyBoard(4), random), random)
        expect(b[1][0]).toBe(2)
        expect(b[1][3]).toBe(4)
    })
})
