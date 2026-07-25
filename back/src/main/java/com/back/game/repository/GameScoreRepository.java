package com.back.game.repository;

import com.back.game.entity.GameScore;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GameScoreRepository extends JpaRepository<GameScore, Long> {

    // 리더보드 상위 N (idx_game_score_game_id_score가 커버). 게임별 정렬 방향(GameDefinition
    // .higherIsBetter)에 따라 서비스가 둘 중 하나를 고른다 — 원본 점수의 의미를 뒤집지 않기 위해
    // 저장값은 항상 게임 고유 단위(점수·ms·횟수) 그대로 두고 정렬만 방향을 바꾼다.
    List<GameScore> findByGameIdOrderByScoreDesc(String gameId, Pageable pageable);

    List<GameScore> findByGameIdOrderByScoreAsc(String gameId, Pageable pageable);

    @Query("SELECT MAX(gs.score) FROM GameScore gs WHERE gs.gameId = :gameId AND gs.userId = :userId")
    Optional<Integer> findMyBestDesc(@Param("gameId") String gameId, @Param("userId") Long userId);

    @Query("SELECT MIN(gs.score) FROM GameScore gs WHERE gs.gameId = :gameId AND gs.userId = :userId")
    Optional<Integer> findMyBestAsc(@Param("gameId") String gameId, @Param("userId") Long userId);

    // "내 순위" = 내 최고기록보다 더 좋은 기록(행 단위, 유저 중복 제거 안 함)의 개수 + 1.
    // 유저별로 하나만 세지 않는 단순화된 근사치다 — 정확한 유저별 dedupe 랭크는 v1 스코프 밖.
    @Query("SELECT COUNT(gs) FROM GameScore gs WHERE gs.gameId = :gameId AND gs.score > :score")
    long countBetterDesc(@Param("gameId") String gameId, @Param("score") int score);

    @Query("SELECT COUNT(gs) FROM GameScore gs WHERE gs.gameId = :gameId AND gs.score < :score")
    long countBetterAsc(@Param("gameId") String gameId, @Param("score") int score);
}
