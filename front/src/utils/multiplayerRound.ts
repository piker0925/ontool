export type MultiplayerRoundPhase = 'lobby' | 'go'

export interface MultiplayerRoundState {
    phase: MultiplayerRoundPhase
    goAt: string | null
}

// reactionTime.ts(싱글)와 달리 이 상태 전이는 로컬 setTimeout이 아니라 서버가 보낸
// round-started SSE 이벤트로만 일어난다 — goAt은 서버가 GO를 브로드캐스트한 시각(ISO 문자열).
// 같은 goAt이 다시 오면(네트워크 재전달 등) 무시하지만, 다른 goAt이 오면(재대결, 193 197) GO
// 상태에서도 새 시각으로 갱신한다 — "이미 GO 상태라 무시"가 아니라 "같은 이벤트라 무시"가 기준이다.
export function handleRoundStarted(state: MultiplayerRoundState, goAt: string): MultiplayerRoundState {
    if (state.goAt === goAt) {
        return state
    }
    return {phase: 'go', goAt}
}
