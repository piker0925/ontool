import {describe, expect, it, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import MinesweeperBoard from './MinesweeperBoard.vue'

// reveal()만 부분 모킹해 승/패를 결정적으로 재현한다 — 실제 지뢰 배치는 무작위라 특정 칸을
// 클릭해 패배를 유도하기 어렵다. 순수 로직(placeMines·createMinesweeperState)은 그대로 두고
// reveal이 돌려주는 status만 시나리오별로 강제한다.
vi.mock('../../utils/minesweeper', async importOriginal => {
    const actual = await importOriginal<typeof import('../../utils/minesweeper')>()
    return {...actual, reveal: vi.fn(actual.reveal)}
})

import {reveal} from '../../utils/minesweeper'

const mockedReveal = reveal as ReturnType<typeof vi.fn>

describe('MinesweeperBoard — 174: onGameEnd(게임 종료 콜백)', () => {
    it('지뢰를 밟아 패배하면 onGameEnd는 호출되지만 submitScore는 호출되지 않는다', async () => {
        mockedReveal.mockImplementation(state => ({...state, status: 'lost'}))
        const submitScore = vi.fn()
        const onGameEnd = vi.fn()
        const wrapper = mount(MinesweeperBoard, {props: {submitScore, onGameEnd}})

        await wrapper.findAll('[data-testid="board"] > button')[0].trigger('click')

        expect(onGameEnd).toHaveBeenCalledTimes(1)
        expect(submitScore).not.toHaveBeenCalled()
    })

    it('모든 안전 칸을 열어 승리하면 onGameEnd와 submitScore가 모두 호출된다', async () => {
        mockedReveal.mockImplementation(state => ({...state, status: 'won'}))
        const submitScore = vi.fn()
        const onGameEnd = vi.fn()
        const wrapper = mount(MinesweeperBoard, {props: {submitScore, onGameEnd}})

        await wrapper.findAll('[data-testid="board"] > button')[0].trigger('click')

        expect(onGameEnd).toHaveBeenCalledTimes(1)
        expect(submitScore).toHaveBeenCalledTimes(1)
    })

    it('게임이 계속 진행 중이면 onGameEnd도 submitScore도 호출되지 않는다', async () => {
        mockedReveal.mockImplementation(state => ({...state, status: 'playing'}))
        const submitScore = vi.fn()
        const onGameEnd = vi.fn()
        const wrapper = mount(MinesweeperBoard, {props: {submitScore, onGameEnd}})

        await wrapper.findAll('[data-testid="board"] > button')[0].trigger('click')

        expect(onGameEnd).not.toHaveBeenCalled()
        expect(submitScore).not.toHaveBeenCalled()
    })
})
