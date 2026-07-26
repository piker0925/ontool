// 174: 게임 리더보드 점수는 게임마다 저장 단위와 의미가 다르다(2048=점수, 반응속도=ms,
// 지뢰찾기=클리어까지 걸린 ms, 사이먼=라운드 등 — 각 보드 컴포넌트의 submitScore 호출부 주석 참조).
// GameCatalog(백엔드)는 순위 정렬 방향·부정행위 검증 규칙만 갖고 있고 "화면에 어떻게 보여줄지"는
// 순수 표시 관심사라 프론트에만 둔다(ADR-0020의 프론트 전용 계산 분리 원칙과 동일한 이유).
//
// game-minesweeper는 GameScore.score 컬럼에 ms 단위 그대로 저장되지만(MinesweeperBoard.vue의
// `props.submitScore?.(Date.now() - startedAt)` 참조) 화면(경과 시간 표시)과 사용자에게는 초 단위가
// 익숙하므로 여기서만 1000으로 나눠 반올림한다 — 그 외 게임은 저장값을 그대로 보여준다.
const GAME_SCORE_FORMATTERS: Record<string, (score: number) => string> = {
    // 점수형(누적 점수를 그대로 저장) — 2048·스네이크(053), 타워쌓기·블록블라스트·매치3·
    // 벽돌깨기·두더지잡기·장애물피하기(121, 캐주얼 게임 8종 중 점수 누적형)
    'game-2048': score => `${score.toLocaleString()}점`,
    'game-snake': score => `${score.toLocaleString()}점`,
    'game-tower-stack': score => `${score.toLocaleString()}점`,
    'game-block-blast': score => `${score.toLocaleString()}점`,
    'game-match3': score => `${score.toLocaleString()}점`,
    'game-breakout': score => `${score.toLocaleString()}점`,
    'game-whack-a-mole': score => `${score.toLocaleString()}점`,
    'game-obstacle-dodge': score => `${score.toLocaleString()}점`,

    'game-reaction-time': score => `${score.toLocaleString()}ms`,
    'game-minesweeper': score => `${Math.round(score / 1000).toLocaleString()}초`,
    'game-simon': score => `${score.toLocaleString()}라운드`,

    // 횟수형(적을수록 좋은 시도/이동 횟수) — 카드짝맞추기·숫자야구(053), 워터소트·슬라이딩퍼즐(121)
    'game-memory-cards': score => `${score.toLocaleString()}번`,
    'game-baseball': score => `${score.toLocaleString()}번`,
    'game-water-sort': score => `${score.toLocaleString()}번`,
    'game-sliding-puzzle': score => `${score.toLocaleString()}번`,
}

/** 게임 id에 맞는 단위를 붙여 점수를 표시용 문자열로 바꾼다. 등록되지 않은 게임 id는 단위 없이 숫자만 표시한다. */
export function formatGameScore(gameId: string, score: number): string {
    const formatter = GAME_SCORE_FORMATTERS[gameId]
    return formatter ? formatter(score) : score.toLocaleString()
}
