package com.back.game.dto;

// nickname은 게스트(비로그인)일 때만 쓰인다 — 로그인 유저는 서버가 실제 계정 닉네임으로 덮어써
// 신원 위장을 막는다(194 결정 사항).
public record RoomJoinRequest(String nickname) {
}
