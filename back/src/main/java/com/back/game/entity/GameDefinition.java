package com.back.game.entity;

/**
 * 게임 하나의 랭킹 채점 규칙(053). 게임마다 "점수"의 의미가 다르므로(2048은 높을수록, 반응속도는
 * 낮을수록 좋음) 정렬 방향과 물리적 상한을 게임별로 선언적으로 갖는다 — 서비스 로직에 게임별 if문을
 * 두지 않고 이 설정만 갈아끼우면 새 게임을 추가할 수 있게 하기 위함.
 *
 * @param id             프론트 카탈로그 모듈 id와 동일 (예: "game-2048")
 * @param higherIsBetter true면 점수 내림차순이 좋은 순위(2048·스네이크),
 *                       false면 오름차순이 좋은 순위(반응속도 ms·지뢰찾기 클리어시간 ms·
 *                       카드짝맞추기 시도횟수·숫자야구 시도횟수·틱택토 승리까지 둔 수)
 * @param minDurationMs  세션 토큰 발급~제출 사이 최소 경과 시간(ms). 이보다 짧으면 최소
 *                       플레이 시간을 만족하지 못한 것으로 보고 거부한다.
 * @param minScore       물리적으로 가능한 최소 score. null이면 하한 검사 없음.
 *                       (반응속도: 인간 반응속도 생리적 하한 근거 80ms 미만은 거부 — 이슈 053 명시 예시)
 * @param maxScorePerMs  durationMs 1ms당 획득 가능한 최대 점수 비율. null이면 상한 검사 없음.
 *                       (2048: 실제 상위권 플레이가 20,000~30,000점을 2~3분(약 0.15~0.2점/ms)에
 *                       달성하는 것을 기준으로, 오탐을 피하려 10배 여유를 둔 2.0점/ms를 상한으로 잡았다
 *                       — 이슈 053이 명시한 "2048 점수-시간 비율" 예시)
 */
public record GameDefinition(
        String id,
        boolean higherIsBetter,
        long minDurationMs,
        Integer minScore,
        Double maxScorePerMs
) {
}
