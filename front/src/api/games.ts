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
