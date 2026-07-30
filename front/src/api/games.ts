import {apiClient} from './client'

// 053: 게임 리더보드 API. 백엔드 com.back.game.dto.* 응답 형태를 그대로 미러링한다.

export interface GameScoreResponse {
    id: number
    gameId: string
    score: number
    durationMs: number
    createdAt: string
    /** 이번에 제출한 점수 그 자체의 순위(1부터) — 리더보드 응답의 myRank(역대 최고 기록 기준)와 다르다. */
    rank: number
}

export interface GameLeaderboardEntry {
    /** 이 기록(GameScore 행) 자체의 식별자 — "방금 제출한 그 기록"을 동점자와 구분해 짚어낼 때 쓴다. */
    id: number
    userId: number
    nickname: string | null
    score: number
    durationMs: number
    createdAt: string
}

export interface GameLeaderboardResponse {
    topScores: GameLeaderboardEntry[]
    myBest: number | null
    myRank: number | null
}

/** 게임 시작 시 세션 토큰을 발급받는다 — 로그인 여부와 무관하게 호출 가능(제출만 로그인 필수). */
export async function startGameSession(gameId: string): Promise<string> {
    const {data} = await apiClient.post<{ sessionToken: string }>(`/api/v1/games/${gameId}/session`)
    return data.sessionToken
}

/** 점수 제출. durationMs는 서버가 세션 토큰 발급 시각으로부터 직접 계산하므로 클라이언트가 보내지 않는다. */
export async function submitGameScore(gameId: string, score: number, sessionToken: string): Promise<GameScoreResponse> {
    const {data} = await apiClient.post<GameScoreResponse>(`/api/v1/games/${gameId}/scores`, {score, sessionToken})
    return data
}

/** 리더보드 조회는 비로그인도 가능 — Authorization 헤더가 있으면 myBest/myRank가 함께 채워진다. */
export async function fetchGameLeaderboard(gameId: string, limit = 10): Promise<GameLeaderboardResponse> {
    const {data} = await apiClient.get<GameLeaderboardResponse>(`/api/v1/games/${gameId}/leaderboard`, {params: {limit}})
    return data
}

// 193: 멀티플레이 방(Room) API. 백엔드 com.back.game.dto.Room* 응답 형태를 그대로 미러링한다.

export interface RoomParticipant {
    id: string
    nickname: string
}

export interface RoomCreateResponse {
    code: string
}

export interface RoomJoinResponse {
    code: string
    participantId: string
    nickname: string
    roomSessionToken: string
    participants: RoomParticipant[]
}

/** 방 생성. 로그인 여부와 무관하게 호출 가능(IP 기준 레이트리밋만 적용). */
export async function createRoom(gameId: string): Promise<RoomCreateResponse> {
    const {data} = await apiClient.post<RoomCreateResponse>(`/api/v1/games/${gameId}/rooms`)
    return data
}

/** 코드로 방 입장. nickname은 게스트일 때만 반영되고, 로그인 유저는 서버가 실제 계정 닉네임으로 강제한다. */
export async function joinRoom(gameId: string, code: string, nickname?: string): Promise<RoomJoinResponse> {
    const {data} = await apiClient.post<RoomJoinResponse>(`/api/v1/games/${gameId}/rooms/${code}/join`, {nickname})
    return data
}

export interface RoomSummary {
    code: string
    participantCount: number
    maxParticipants: number
}

/** 코드 입력 없이 고를 수 있는 대기중인 공개방 목록. 시작 전·정원 미달인 방만 온다. */
export async function listRooms(gameId: string): Promise<RoomSummary[]> {
    const {data} = await apiClient.get<RoomSummary[]>(`/api/v1/games/${gameId}/rooms`)
    return data
}

export interface RoomStartResponse {
    goAt: string
}

/** 라운드 시작. 방장(가장 먼저 입장한 참가자)만 성공하며, 성공하면 방 전체에 GO 신호가 브로드캐스트된다. */
export async function startRoom(gameId: string, code: string, participantId: string, roomSessionToken: string): Promise<RoomStartResponse> {
    const {data} = await apiClient.post<RoomStartResponse>(`/api/v1/games/${gameId}/rooms/${code}/start`, {participantId, roomSessionToken})
    return data
}

/** 재대결. 방을 새로 만들지 않고 같은 참가자 구성으로 다음 라운드를 시작한다(이전 클릭·결과 초기화). */
export async function nextRoom(gameId: string, code: string, participantId: string, roomSessionToken: string): Promise<RoomStartResponse> {
    const {data} = await apiClient.post<RoomStartResponse>(`/api/v1/games/${gameId}/rooms/${code}/next-round`, {participantId, roomSessionToken})
    return data
}

export interface RoomRoundResultEntry {
    participantId: string
    nickname: string
    rank: number
    falseStart: boolean
}

/** 클릭 제출. 서버가 기록한 도착 시각으로 순위를 매기며(클라이언트 자체 신고 불신), 제출마다 갱신된 순위를 돌려준다. */
export async function submitRoomClick(gameId: string, code: string, participantId: string, roomSessionToken: string): Promise<RoomRoundResultEntry[]> {
    const {data} = await apiClient.post<RoomRoundResultEntry[]>(`/api/v1/games/${gameId}/rooms/${code}/click`, {participantId, roomSessionToken})
    return data
}

export interface RoomCodeRainClaimResponse {
    participantId: string
    nickname: string
    wordId: number
    wordText: string
    score: number
    comboCount: number
    attackTriggered: boolean
    attackWord?: string | null
}

/** Dev Code Rain Typing 단어 뺏어치기 제출 */
export async function claimCodeRainWordApi(gameId: string, code: string, participantId: string, roomSessionToken: string, wordId: number, wordText: string): Promise<RoomCodeRainClaimResponse> {
    const {data} = await apiClient.post<RoomCodeRainClaimResponse>(`/api/v1/games/${gameId}/rooms/${code}/claim-word`, {participantId, roomSessionToken, wordId, wordText})
    return data
}

export interface RoomTetrisGarbageAttackResponse {
    attackerParticipantId: string
    attackerNickname: string
    garbageLinesAdded: number
}

/** 테트리스 라인 클리어 공격 제출 */
export async function clearTetrisLinesApi(gameId: string, code: string, participantId: string, roomSessionToken: string, clearedLineCount: number): Promise<RoomTetrisGarbageAttackResponse> {
    const {data} = await apiClient.post<RoomTetrisGarbageAttackResponse>(`/api/v1/games/${gameId}/rooms/${code}/clear-lines`, {participantId, roomSessionToken, clearedLineCount})
    return data
}

export interface RoomOmokMoveResponse {
    participantId: string
    nickname: string
    x: number
    y: number
    nextTurnParticipantId: string
    timeRemainingSec: number
    winnerParticipantId?: string | null
}

/** 오목 착수 제출 */
export async function placeOmokStoneApi(gameId: string, code: string, participantId: string, roomSessionToken: string, x: number, y: number): Promise<RoomOmokMoveResponse> {
    const {data} = await apiClient.post<RoomOmokMoveResponse>(`/api/v1/games/${gameId}/rooms/${code}/place-stone`, {participantId, roomSessionToken, x, y})
    return data
}

export interface RoomDinoProgressResponse {
    participantId: string
    nickname: string
    score: number
    isAlive: boolean
    dinoY: number
    isJumping: boolean
    isDucking: boolean
}

/** 공룡 게임 실시간 위치/점수/생존 제출 */
export async function reportDinoProgressApi(
    gameId: string,
    code: string,
    participantId: string,
    roomSessionToken: string,
    score: number,
    isAlive: boolean,
    dinoY: number,
    isJumping: boolean,
    isDucking: boolean
): Promise<RoomDinoProgressResponse> {
    const {data} = await apiClient.post<RoomDinoProgressResponse>(`/api/v1/games/${gameId}/rooms/${code}/dino-progress`, {
        participantId,
        roomSessionToken,
        score,
        isAlive,
        dinoY,
        isJumping,
        isDucking
    })
    return data
}
