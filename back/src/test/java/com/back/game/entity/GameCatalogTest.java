package com.back.game.entity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 121: 캐주얼 게임 9종의 GameCatalog 등록 검증. 프론트 shellComponents.ts/mock.ts에 등록된
 * moduleId와 정확히 일치해야 하고, 각 게임의 실제 점수 방향(높을수록/낮을수록 좋음)에 맞는
 * higherIsBetter가 붙어야 한다 — 이 값이 틀리면 리더보드 정렬 방향이 뒤집힌다.
 */
class GameCatalogTest {

    @Test
    void 등록되지_않은_게임_id는_빈_값을_반환한다() {
        assertThat(GameCatalog.find("game-not-real")).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
            "game-tower-stack, true",
            "game-block-blast, true",
            "game-match3, true",
            "game-breakout, true",
            "game-whack-a-mole, true",
            "game-obstacle-dodge, true",
            "game-water-sort, false",
            "game-sliding-puzzle, false",
            "game-word-guess, false",
    })
    void 신규_게임_9종은_실제_점수_방향에_맞는_higherIsBetter로_등록돼_있다(String gameId, boolean expectedHigherIsBetter) {
        Optional<GameDefinition> definition = GameCatalog.find(gameId);

        assertThat(definition).isPresent();
        assertThat(definition.get().id()).isEqualTo(gameId);
        assertThat(definition.get().higherIsBetter()).isEqualTo(expectedHigherIsBetter);
        // 즉시 제출(위조/재생 공격)을 거르는 최소 시간이 반드시 있어야 한다.
        assertThat(definition.get().minDurationMs()).isGreaterThan(0);
    }

    @ParameterizedTest
    @CsvSource({
            "game-water-sort",
            "game-sliding-puzzle",
            "game-word-guess",
    })
    void 시도_횟수_점수_게임은_0회_완성을_물리적으로_불가능한_값으로_거른다(String gameId) {
        // 최소 1수/1회는 둬야 승패가 갈리는 게임들 — score=0은 실제로 나올 수 없는 값이라
        // minScore=1로 걸러야 한다(기존 반응속도 게임의 minScore=80과 같은 개념).
        Optional<GameDefinition> definition = GameCatalog.find(gameId);

        assertThat(definition).isPresent();
        assertThat(definition.get().minScore()).isEqualTo(1);
    }

    @Test
    void 기존_8개_게임_등록은_121_작업으로_바뀌지_않았다() {
        assertThat(GameCatalog.find("game-2048")).isPresent();
        assertThat(GameCatalog.find("game-2048").get().higherIsBetter()).isTrue();
        assertThat(GameCatalog.find("game-2048").get().maxScorePerMs()).isEqualTo(2.0);

        assertThat(GameCatalog.find("game-reaction-time")).isPresent();
        assertThat(GameCatalog.find("game-reaction-time").get().higherIsBetter()).isFalse();
        assertThat(GameCatalog.find("game-reaction-time").get().minScore()).isEqualTo(80);
    }
}
