import {describe, expect, it, vi} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import CodeRainBattleLobby from './CodeRainBattleLobby.vue'
import {listRooms} from '@/api/games'

vi.mock('@/api/games', () => ({
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    startRoom: vi.fn(),
    submitRoomClick: vi.fn(),
    nextRoom: vi.fn(),
    listRooms: vi.fn(),
}))

const mockListRooms = listRooms as ReturnType<typeof vi.fn>

describe('CodeRainBattleLobby', () => {
    it('초기 상태에서 방 만들기 버튼과 대기중인 방 목록이 표시된다', async () => {
        mockListRooms.mockResolvedValue([])

        const wrapper = mount(CodeRainBattleLobby, {
            props: {gameId: 'game-code-rain-typing'}
        })
        await flushPromises()

        expect(wrapper.find('[data-testid="code-rain-create"]').exists()).toBe(true)
        expect(mockListRooms).toHaveBeenCalledWith('game-code-rain-typing')
        expect(wrapper.find('[data-testid="code-rain-room-empty"]').exists()).toBe(true)
    })
})
