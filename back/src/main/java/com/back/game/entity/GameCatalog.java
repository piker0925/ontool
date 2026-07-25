package com.back.game.entity;

import java.util.Map;
import java.util.Optional;

/**
 * 8개 게임의 채점 규칙 레지스트리(053). 프론트 shellComponents.ts / mock.ts 카탈로그의 8개 게임
 * moduleId와 정확히 일치해야 한다. minDurationMs는 각 게임을 "정상적으로 최소 1판" 진행하는 데
 * 걸리는 시간을 넉넉히 낮춰 잡았다 — 실제 플레이를 막지 않으면서 즉시 제출(위조/재생 공격)만 거른다.
 */
public final class GameCatalog {

    private static final Map<String, GameDefinition> DEFINITIONS = Map.ofEntries(
            // 점수 자체가 누적식이라 최소 한 번의 이동+렌더가 필요 (500ms) + 점수-시간 비율 상한
            Map.entry("game-2048", new GameDefinition("game-2048", true, 500, null, 2.0)),
            // 시작 버튼 클릭 후 최소 한 틱(150ms) 이상 지나야 먹이를 먹을 수 있음
            Map.entry("game-snake", new GameDefinition("game-snake", true, 300, null, null)),
            // 신호 대기(최소 1000ms) + 클릭까지 포함해야 결과가 나옴, 점수(ms) 자체 하한
            Map.entry("game-reaction-time", new GameDefinition("game-reaction-time", false, 900, 80, null)),
            // 최소 한 칸을 열어야 승패가 갈림
            Map.entry("game-minesweeper", new GameDefinition("game-minesweeper", false, 300, null, null)),
            // 첫 라운드 시퀀스 재생(SHOW_MS+GAP_MS=700ms)을 봐야 입력 가능
            Map.entry("game-simon", new GameDefinition("game-simon", true, 600, null, null)),
            // 카드 짝 확인에 RESOLVE_DELAY_MS(700ms) 이상 소요
            Map.entry("game-memory-cards", new GameDefinition("game-memory-cards", false, 600, null, null)),
            // 최소 한 번 추측 제출
            Map.entry("game-baseball", new GameDefinition("game-baseball", false, 300, null, null)),
            // 사람 수 + 컴퓨터 응답 지연(400ms) 이상. score는 "승리까지 둔 사람 수"(적을수록 좋음)
            Map.entry("game-tictactoe", new GameDefinition("game-tictactoe", false, 400, null, null))
    );

    private GameCatalog() {
    }

    public static Optional<GameDefinition> find(String gameId) {
        return Optional.ofNullable(DEFINITIONS.get(gameId));
    }
}
