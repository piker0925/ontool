package com.back.game.dto;

import com.back.game.entity.Room;

// 대기중인 공개방 목록 항목 — 참가자 닉네임 등 상세 정보는 노출하지 않고, 목록에서 고를 때 필요한
// 최소 정보(인원수)만 담는다.
public record RoomSummaryResponse(String code, int participantCount, int maxParticipants) {
    public static RoomSummaryResponse from(Room room) {
        return new RoomSummaryResponse(room.code(), room.participants().size(), room.maxParticipants());
    }
}
