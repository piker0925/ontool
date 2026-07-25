package com.back.game.entity;

import java.util.Map;
import java.util.Optional;

/**
 * 16개 게임의 채점 규칙 레지스트리(053, 121). 프론트 shellComponents.ts / mock.ts 카탈로그의
 * 게임 moduleId와 정확히 일치해야 한다. minDurationMs는 각 게임을 "정상적으로 최소 1판" 진행하는 데
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
            Map.entry("game-tictactoe", new GameDefinition("game-tictactoe", false, 400, null, null)),

            // --- 121: 캐주얼 게임 8종 (한글 단어맞추기는 166에서 드롭) ---
            // 움직이는 블록을 최소 한 번은 관찰하고 탭해야 첫 점수가 남 — 사람이 반응할 시간을 감안
            Map.entry("game-tower-stack", new GameDefinition("game-tower-stack", true, 300, null, null)),
            // 조각 선택 탭 + 배치 탭, 최소 두 번의 상호작용
            Map.entry("game-block-blast", new GameDefinition("game-block-blast", true, 400, null, null)),
            // 타일 선택 탭 + 인접 타일 탭, 최소 두 번의 상호작용
            Map.entry("game-match3", new GameDefinition("game-match3", true, 400, null, null)),
            // 공이 패들/벽돌에 튕기는 물리 시뮬레이션이 최소 한 프레임 이상 진행돼야 함
            Map.entry("game-breakout", new GameDefinition("game-breakout", true, 300, null, null)),
            // 두더지가 최소 한 번 등장(스폰 틱 100ms)한 뒤 반응해서 클릭해야 점수가 남
            Map.entry("game-whack-a-mole", new GameDefinition("game-whack-a-mole", true, 300, null, null)),
            // 새가 최소 한 번 파이프를 통과할 시간(파이프 이동 물리상 약 1.7초)보다 넉넉히 낮은 하한
            Map.entry("game-obstacle-dodge", new GameDefinition("game-obstacle-dodge", true, 500, null, null)),
            // 시험관 선택 탭 + 대상 시험관 탭, 최소 두 번의 상호작용. score=이동 횟수(적을수록 좋음),
            // 최소 1수는 둬야 하므로 0은 물리적으로 불가능한 값
            Map.entry("game-water-sort", new GameDefinition("game-water-sort", false, 400, 1, null)),
            // 타일 클릭 최소 두 번(빈칸 인접 판정), score=이동 횟수(적을수록 좋음), 0수 완성은 불가능
            Map.entry("game-sliding-puzzle", new GameDefinition("game-sliding-puzzle", false, 400, 1, null))
    );

    private GameCatalog() {
    }

    public static Optional<GameDefinition> find(String gameId) {
        return Optional.ofNullable(DEFINITIONS.get(gameId));
    }
}
