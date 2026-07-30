import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import ReactionBattleLobby from './ReactionBattleLobby.vue'
import {accessToken} from '@/composables/useAuth'
import {createRoom, joinRoom, listRooms, nextRoom, submitRoomClick} from '@/api/games'

vi.mock('@/api/games', () => ({
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    startRoom: vi.fn(),
    submitRoomClick: vi.fn(),
    nextRoom: vi.fn(),
    listRooms: vi.fn(),
}))

const mockNextRoom = nextRoom as ReturnType<typeof vi.fn>
const mockCreateRoom = createRoom as ReturnType<typeof vi.fn>
const mockJoinRoom = joinRoom as ReturnType<typeof vi.fn>
const mockSubmitRoomClick = submitRoomClick as ReturnType<typeof vi.fn>
const mockListRooms = listRooms as ReturnType<typeof vi.fn>

// jsdom엔 EventSource가 없어 최소 mock을 직접 둔다 — useHeavyJob.test.ts의 MockEventSource와 동일 패턴.
class MockEventSource {
    static instances: MockEventSource[] = []
    url: string
    private listeners: Record<string, Array<(e: MessageEvent) => void>> = {}
    closeSpy = vi.fn()

    constructor(url: string) {
        this.url = url
        MockEventSource.instances.push(this)
    }

    addEventListener(type: string, cb: (e: MessageEvent) => void) {
        (this.listeners[type] ??= []).push(cb)
    }

    close() {
        this.closeSpy()
    }

    emit(type: string, data: unknown) {
        const event = {data: JSON.stringify(data)} as MessageEvent
        for (const cb of this.listeners[type] ?? []) cb(event)
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    MockEventSource.instances = []
    vi.stubGlobal('EventSource', MockEventSource)
    accessToken.value = null
    mockListRooms.mockResolvedValue([])
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('ReactionBattleLobby — 방 생성', () => {
    it('게스트가 방을 만들면 랜덤 닉네임으로 자동 입장되고 코드·본인이 참가자 목록에 표시된다', async () => {
        mockCreateRoom.mockResolvedValue({code: '1234'})
        mockJoinRoom.mockResolvedValue({
            code: '1234',
            participantId: 'p1',
            nickname: '행복한 너구리',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '행복한 너구리'}],
        })

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()

        expect(mockJoinRoom).toHaveBeenCalledWith('game-reaction-time', '1234', expect.any(String))
        expect(wrapper.find('[data-testid="battle-code-display"]').text()).toBe('1234')
        expect(wrapper.find('[data-testid="battle-participants"]').text()).toContain('행복한 너구리')
    })

    it('로그인 상태면 게스트 닉네임을 생성하지 않고 undefined로 요청한다(서버가 실제 닉네임으로 강제)', async () => {
        accessToken.value = 'token'
        mockCreateRoom.mockResolvedValue({code: '5678'})
        mockJoinRoom.mockResolvedValue({
            code: '5678',
            participantId: 'p1',
            nickname: '실제닉네임',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '실제닉네임'}],
        })

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()

        expect(mockJoinRoom).toHaveBeenCalledWith('game-reaction-time', '5678', undefined)
    })
})

describe('ReactionBattleLobby — 본인 표시', () => {
    it('참가자 목록에서 본인 행에만 "나" 표시가 붙는다(게스트 랜덤 닉네임이라 participantId로 판별)', async () => {
        mockCreateRoom.mockResolvedValue({code: '7777'})
        mockJoinRoom.mockResolvedValue({
            code: '7777',
            participantId: 'p1',
            nickname: '행복한 너구리',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '행복한 너구리'}],
        })

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()

        const es = MockEventSource.instances[0]
        es.emit('participant-joined', [
            {id: 'p1', nickname: '행복한 너구리'},
            {id: 'p2', nickname: '슬픈 코알라'},
        ])
        await flushPromises()

        const rows = wrapper.findAll('[data-testid="battle-participants"] > div')
        const myRow = rows.find(r => r.text().includes('행복한 너구리'))
        const otherRow = rows.find(r => r.text().includes('슬픈 코알라'))

        expect(myRow?.text()).toContain('나')
        expect(otherRow?.text()).not.toContain('나')
    })
})

describe('ReactionBattleLobby — 대기방 목록에서 참가', () => {
    it('대기중인 방 목록을 보여주고, 그중 하나를 클릭하면 그 방에 참가한다', async () => {
        mockListRooms.mockResolvedValue([{code: '4321', participantCount: 1, maxParticipants: 5}])
        mockJoinRoom.mockResolvedValue({
            code: '4321',
            participantId: 'p2',
            nickname: '나',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '방장'}, {id: 'p2', nickname: '나'}],
        })

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await flushPromises()

        expect(mockListRooms).toHaveBeenCalledWith('game-reaction-time')
        const roomItem = wrapper.find('[data-testid="battle-room-item"]')
        expect(roomItem.text()).toContain('1')
        expect(roomItem.text()).toContain('5')

        await roomItem.trigger('click')
        await flushPromises()

        expect(mockJoinRoom).toHaveBeenCalledWith('game-reaction-time', '4321', expect.any(String))
        expect(wrapper.find('[data-testid="battle-code-display"]').text()).toBe('4321')
        expect(wrapper.find('[data-testid="battle-participants"]').text()).toContain('방장')
        expect(wrapper.find('[data-testid="battle-participants"]').text()).toContain('나')
    })

    it('대기중인 방이 없으면 빈 상태 안내를 보여준다', async () => {
        mockListRooms.mockResolvedValue([])

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await flushPromises()

        expect(wrapper.find('[data-testid="battle-room-empty"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="battle-room-item"]').exists()).toBe(false)
    })

    it('참가에 실패하면 에러 메시지를 보여준다', async () => {
        mockListRooms.mockResolvedValue([{code: '0000', participantCount: 1, maxParticipants: 5}])
        mockJoinRoom.mockRejectedValue({response: {data: {message: '존재하지 않는 방입니다.'}}})

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await flushPromises()
        await wrapper.find('[data-testid="battle-room-item"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="battle-error"]').text()).toBe('존재하지 않는 방입니다.')
    })
})

describe('ReactionBattleLobby — 실시간 갱신', () => {
    it('다른 참가자가 입장하면 SSE 이벤트로 참가자 목록이 즉시 갱신된다', async () => {
        mockCreateRoom.mockResolvedValue({code: '1111'})
        mockJoinRoom.mockResolvedValue({
            code: '1111',
            participantId: 'p1',
            nickname: '방장',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '방장'}],
        })

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="battle-participants"]').text()).not.toContain('새참가자')

        const es = MockEventSource.instances[0]
        es.emit('participant-joined', [{id: 'p1', nickname: '방장'}, {id: 'p2', nickname: '새참가자'}])
        await flushPromises()

        expect(wrapper.find('[data-testid="battle-participants"]').text()).toContain('새참가자')
    })

    it('라운드가 시작되면(round-started) GO 화면으로 전환된다', async () => {
        mockCreateRoom.mockResolvedValue({code: '2222'})
        mockJoinRoom.mockResolvedValue({
            code: '2222',
            participantId: 'p1',
            nickname: '방장',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '방장'}],
        })

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()

        const es = MockEventSource.instances[0]
        es.emit('round-started', {goAt: '2026-07-28T12:00:00.000Z'})
        await flushPromises()

        expect(wrapper.find('[data-testid="battle-go"]').exists()).toBe(true)
    })
})

describe('ReactionBattleLobby — 클릭 + 순위 결과', () => {
    it('GO 화면을 클릭하면 클릭을 제출하고, round-result 이벤트를 받으면 순위 결과를 보여준다', async () => {
        mockCreateRoom.mockResolvedValue({code: '3333'})
        mockJoinRoom.mockResolvedValue({
            code: '3333',
            participantId: 'p1',
            nickname: '방장',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '방장'}, {id: 'p2', nickname: '게스트'}],
        })
        mockSubmitRoomClick.mockResolvedValue([{participantId: 'p1', nickname: '방장', rank: 1, falseStart: false}])

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()
        const es = MockEventSource.instances[0]
        es.emit('round-started', {goAt: '2026-07-28T12:00:00.000Z'})
        await flushPromises()

        await wrapper.find('[data-testid="battle-go"]').trigger('click')
        await flushPromises()

        expect(mockSubmitRoomClick).toHaveBeenCalledWith('game-reaction-time', '3333', 'p1', 'room-token')
        expect(wrapper.find('[data-testid="battle-go"]').exists()).toBe(false)
        expect(wrapper.findAll('[data-testid="battle-result-row"]').length).toBe(1)
        expect(wrapper.text()).toContain('1등 — 방장')
    })

    it('결과 화면에 참가자별 네트워크 지연 차이 안내 문구가 있다', async () => {
        mockCreateRoom.mockResolvedValue({code: '4444'})
        mockJoinRoom.mockResolvedValue({
            code: '4444',
            participantId: 'p1',
            nickname: '방장',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '방장'}],
        })
        mockSubmitRoomClick.mockResolvedValue([{participantId: 'p1', nickname: '방장', rank: 1, falseStart: false}])

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()
        MockEventSource.instances[0].emit('round-started', {goAt: '2026-07-28T12:00:00.000Z'})
        await flushPromises()
        await wrapper.find('[data-testid="battle-go"]').trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('네트워크 지연')
    })

    it('다른 참가자가 먼저 클릭해도, 아직 클릭하지 않은 사람은 계속 GO 화면에 남아 클릭할 기회를 잃지 않는다', async () => {
        // 실브라우저 E2E에서 발견된 버그: results가 비어있지 않다는 것만으로 결과 화면 전환을 판단하면,
        // 남이 먼저 클릭하는 순간 아직 안 누른 사람 화면까지 결과로 넘어가버려 클릭 기회를 잃는다.
        mockCreateRoom.mockResolvedValue({code: '5555'})
        mockJoinRoom.mockResolvedValue({
            code: '5555',
            participantId: 'p1',
            nickname: '방장',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '방장'}, {id: 'p2', nickname: '게스트'}],
        })

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()
        const es = MockEventSource.instances[0]
        es.emit('round-started', {goAt: '2026-07-28T12:00:00.000Z'})
        await flushPromises()

        // 본인(p1)은 아직 클릭 안 했지만, 다른 참가자(p2)가 먼저 클릭해서 서버가 브로드캐스트한 결과를 받는다.
        es.emit('round-result', [{participantId: 'p2', nickname: '게스트', rank: 1, falseStart: false}])
        await flushPromises()

        expect(mockSubmitRoomClick).not.toHaveBeenCalled()
        expect(wrapper.find('[data-testid="battle-go"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="battle-result-row"]').exists()).toBe(false)
    })

    it('아직 클릭하지 않은 사람도 GO를 눌러 클릭을 제출하면, 이미 받아둔 최신 순위에 본인 결과까지 반영된 화면을 본다', async () => {
        mockCreateRoom.mockResolvedValue({code: '5556'})
        mockJoinRoom.mockResolvedValue({
            code: '5556',
            participantId: 'p1',
            nickname: '방장',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '방장'}, {id: 'p2', nickname: '게스트'}],
        })
        mockSubmitRoomClick.mockResolvedValue([
            {participantId: 'p2', nickname: '게스트', rank: 1, falseStart: false},
            {participantId: 'p1', nickname: '방장', rank: 2, falseStart: false},
        ])

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()
        const es = MockEventSource.instances[0]
        es.emit('round-started', {goAt: '2026-07-28T12:00:00.000Z'})
        await flushPromises()
        es.emit('round-result', [{participantId: 'p2', nickname: '게스트', rank: 1, falseStart: false}])
        await flushPromises()

        await wrapper.find('[data-testid="battle-go"]').trigger('click')
        await flushPromises()

        expect(wrapper.findAll('[data-testid="battle-result-row"]').length).toBe(2)
        expect(wrapper.text()).toContain('1등 — 게스트')
        expect(wrapper.text()).toContain('2등 — 방장')
    })
})

describe('ReactionBattleLobby — 재대결', () => {
    it('방장이 결과 화면에서 다음 라운드를 누르면 재대결을 요청하고, round-started(새 goAt)를 받으면 결과가 지워지고 다시 GO 대기 화면이 된다', async () => {
        mockCreateRoom.mockResolvedValue({code: '6666'})
        mockJoinRoom.mockResolvedValue({
            code: '6666',
            participantId: 'p1',
            nickname: '방장',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '방장'}],
        })
        mockSubmitRoomClick.mockResolvedValue([{participantId: 'p1', nickname: '방장', rank: 1, falseStart: false}])

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()
        const es = MockEventSource.instances[0]
        es.emit('round-started', {goAt: '2026-07-28T12:00:00.000Z'})
        await flushPromises()
        await wrapper.find('[data-testid="battle-go"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-testid="battle-next-round"]').exists()).toBe(true)

        await wrapper.find('[data-testid="battle-next-round"]').trigger('click')
        await flushPromises()

        expect(mockNextRoom).toHaveBeenCalledWith('game-reaction-time', '6666', 'p1', 'room-token')

        es.emit('round-started', {goAt: '2026-07-28T12:05:00.000Z'})
        await flushPromises()

        expect(wrapper.find('[data-testid="battle-result-row"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="battle-go"]').exists()).toBe(true)
    })

    it('미래의 goAt 시각을 전달받으면 신호 발생 전까지 "기다리세요…"를 보여준다', async () => {
        vi.useFakeTimers()
        const now = new Date('2026-07-31T10:00:00.000Z').getTime()
        vi.setSystemTime(now)

        mockCreateRoom.mockResolvedValue({code: '7777'})
        mockJoinRoom.mockResolvedValue({
            code: '7777',
            participantId: 'p1',
            nickname: '방장',
            roomSessionToken: 'room-token',
            participants: [{id: 'p1', nickname: '방장'}],
        })

        const wrapper = mount(ReactionBattleLobby, {props: {gameId: 'game-reaction-time'}})
        await wrapper.find('[data-testid="battle-create"]').trigger('click')
        await flushPromises()

        const es = MockEventSource.instances[0]
        // 2초 뒤 goAt
        const futureGoAt = new Date(now + 2000).toISOString()
        es.emit('round-started', {goAt: futureGoAt})
        await flushPromises()

        const battleGo = wrapper.find('[data-testid="battle-go"]')
        expect(battleGo.text()).toContain('기다리세요…')

        // 2초 경과
        vi.advanceTimersByTime(2000)
        await wrapper.vm.$nextTick()

        expect(battleGo.text()).toContain('지금 클릭!')
        vi.useRealTimers()
    })
})
