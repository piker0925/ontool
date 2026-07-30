import {computed, ref} from 'vue'
import {createRoom, joinRoom, nextRoom, startRoom, submitRoomClick, type RoomParticipant, type RoomRoundResultEntry} from '../api/games'
import {handleRoundStarted, type MultiplayerRoundState} from '../utils/multiplayerRound'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

/**
 * 193 파일럿 — 멀티플레이 방(로비) 생성/입장/실시간 참가자 목록.
 * 서버가 참가자 입장을 SSE로 즉시 밀어준다(JobController의 폴링형 SSE와 달리 진짜 push) —
 * useHeavyJob.ts와 같은 EventSource 패턴을 따르되, 재연결 로직은 로비 생명주기가 짧아 생략한다.
 */
export interface DinoParticipantProgress {
    participantId: string
    nickname: string
    score: number
    isAlive: boolean
    dinoY: number
    isJumping: boolean
    isDucking: boolean
}

export function useRoomLobby() {
    const code = ref<string | null>(null)
    const participantId = ref<string | null>(null)
    const roomSessionToken = ref<string | null>(null)
    const participants = ref<RoomParticipant[]>([])
    const error = ref<string | null>(null)
    const round = ref<MultiplayerRoundState>({phase: 'lobby', goAt: null})
    const results = ref<RoomRoundResultEntry[]>([])
    const dinoProgressMap = ref<Record<string, DinoParticipantProgress>>({})
    const codeRainClaimedEvent = ref<{ participantId: string; nickname: string; wordId: number; wordText: string } | null>(null)
    const tetrisGarbageAttackEvent = ref<{ attackerParticipantId: string; attackerNickname: string; garbageLinesAdded: number } | null>(null)

    let eventSource: EventSource | null = null

    // 방장 = 가장 먼저 입장한 참가자(참가자 목록 0번째) — 백엔드 Room.isHost와 같은 판정 기준.
    const isHost = computed(() => !!participantId.value && participants.value[0]?.id === participantId.value)

    // results가 비어있지 않다는 것만으로 "결과 화면"을 판단하면 안 된다 — 클릭마다 실시간 재브로드캐스트
    // 하는 구조라, 다른 참가자가 먼저 클릭한 순간 아직 안 누른 사람 화면까지 결과 화면으로 넘어가버려
    // 정작 자기 클릭을 제출할 기회를 잃는다(실브라우저 E2E로 발견). 본인 클릭이 결과에 반영됐는지로 판단한다.
    const hasSubmitted = computed(() => results.value.some(r => r.participantId === participantId.value))

    function connectStream(gameId: string, roomCode: string) {
        eventSource?.close()
        const es = new EventSource(`${API_BASE}/api/v1/games/${gameId}/rooms/${roomCode}/stream`)
        eventSource = es
        es.addEventListener('participant-joined', (e: MessageEvent) => {
            participants.value = JSON.parse(e.data)
        })
        es.addEventListener('round-started', (e: MessageEvent) => {
            const payload = JSON.parse(e.data)
            const next = handleRoundStarted(round.value, payload.goAt)
            if (next !== round.value) {
                results.value = [] // 재대결 포함, 새 GO 시각을 받으면 이전 라운드 결과 화면을 지운다
                dinoProgressMap.value = {}
            }
            round.value = next
        })
        es.addEventListener('round-result', (e: MessageEvent) => {
            results.value = JSON.parse(e.data)
        })
        es.addEventListener('dino-progress', (e: MessageEvent) => {
            const raw: any = JSON.parse(e.data)
            const normalized: DinoParticipantProgress = {
                participantId: raw.participantId,
                nickname: raw.nickname,
                score: raw.score ?? 0,
                isAlive: raw.isAlive ?? raw.alive ?? true,
                dinoY: raw.dinoY ?? 0,
                isJumping: raw.isJumping ?? raw.jumping ?? false,
                isDucking: raw.isDucking ?? raw.ducking ?? false,
            }
            dinoProgressMap.value = {
                ...dinoProgressMap.value,
                [normalized.participantId]: normalized
            }
        })
        es.addEventListener('code-rain-claimed', (e: MessageEvent) => {
            codeRainClaimedEvent.value = JSON.parse(e.data)
        })
        es.addEventListener('tetris-garbage-attack', (e: MessageEvent) => {
            tetrisGarbageAttackEvent.value = JSON.parse(e.data)
        })
    }

    async function startRound(gameId: string) {
        if (!code.value || !participantId.value || !roomSessionToken.value) return
        await startRoom(gameId, code.value, participantId.value, roomSessionToken.value)
    }

    async function submitClick(gameId: string) {
        if (!code.value || !participantId.value || !roomSessionToken.value) return
        results.value = await submitRoomClick(gameId, code.value, participantId.value, roomSessionToken.value)
    }

    async function nextRound(gameId: string) {
        if (!code.value || !participantId.value || !roomSessionToken.value) return
        await nextRoom(gameId, code.value, participantId.value, roomSessionToken.value)
    }

    // 방장도 결국 "가장 먼저 입장한 참가자"다 — 백엔드는 방 생성과 입장을 별개 엔드포인트로 두므로,
    // 여기서 생성 직후 곧바로 입장까지 이어서 호출해 호출자는 "방을 만들면 그 안에 있다"로 단순하게 쓴다.
    async function create(gameId: string, nickname?: string) {
        error.value = null
        const room = await createRoom(gameId)
        await join(gameId, room.code, nickname)
        return room.code
    }

    async function join(gameId: string, roomCode: string, nickname?: string) {
        error.value = null
        try {
            const response = await joinRoom(gameId, roomCode, nickname)
            code.value = response.code
            participantId.value = response.participantId
            roomSessionToken.value = response.roomSessionToken
            participants.value = response.participants
            connectStream(gameId, response.code)
        } catch (e: any) {
            error.value = e.response?.data?.message ?? '방 입장에 실패했습니다.'
            throw e
        }
    }

    function leaveBeacon(gameId: string) {
        if (code.value && participantId.value && roomSessionToken.value) {
            const url = `${API_BASE}/api/v1/games/${gameId}/rooms/${code.value}/leave`
            const payload = JSON.stringify({
                participantId: participantId.value,
                roomSessionToken: roomSessionToken.value
            })
            const blob = new Blob([payload], { type: 'application/json' })
            if (navigator.sendBeacon) {
                navigator.sendBeacon(url, blob)
            }
        }
    }

    async function leave(gameId: string) {
        leaveBeacon(gameId)
        stop()
        code.value = null
        participantId.value = null
        roomSessionToken.value = null
        participants.value = []
        round.value = {phase: 'lobby', goAt: null}
        results.value = []
        dinoProgressMap.value = {}
    }

    function stop() {
        eventSource?.close()
        eventSource = null
    }

    return {code, participantId, roomSessionToken, participants, error, round, results, dinoProgressMap, codeRainClaimedEvent, tetrisGarbageAttackEvent, isHost, hasSubmitted, create, join, leave, leaveBeacon, startRound, submitClick, nextRound, stop}
}
