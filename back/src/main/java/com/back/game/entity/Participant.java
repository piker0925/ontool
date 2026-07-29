package com.back.game.entity;

/**
 * 방(Room)에 입장한 한 명. userId가 null이면 게스트(비로그인) — 194에서 닉네임은
 * 서비스 계층이 결정해 넣어준다(로그인 실닉네임 vs 게스트 랜덤 닉네임).
 */
public record Participant(String id, String nickname, Long userId) {
}
