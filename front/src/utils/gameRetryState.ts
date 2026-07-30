// 게임 다시 도전(Retry) 시 Ready 오버레이를 건너뛰고 즉시 플레이로 진입하기 위한 프론트엔드 상태 추적기.
// GamePage.vue의 restartKey 변경으로 인한 컴포넌트 마운트 재시작에서도 재시도(Retry) 여부를 유지한다.

const retryRequestedMap = new Map<string, boolean>()

export function requestGameRetry(gameId: string): void {
    retryRequestedMap.set(gameId, true)
}

export function consumeGameRetry(gameId: string): boolean {
    if (retryRequestedMap.get(gameId)) {
        retryRequestedMap.delete(gameId)
        return true
    }
    return false
}
