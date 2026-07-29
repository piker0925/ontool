package com.back.game.entity;

import java.time.Instant;

/** 참가자 한 명의 클릭 — arrivedAt은 서버가 요청을 받은 시각(클라이언트 자체 신고 불신, 193 결정). */
public record ClickEvent(String participantId, Instant arrivedAt) {
}
