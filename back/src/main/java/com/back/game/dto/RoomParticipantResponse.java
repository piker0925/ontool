package com.back.game.dto;

import com.back.game.entity.Participant;

// userId는 다른 참가자에게 노출하지 않는다 — 방 화면에는 닉네임만 필요하다.
public record RoomParticipantResponse(String id, String nickname) {
    public static RoomParticipantResponse from(Participant participant) {
        return new RoomParticipantResponse(participant.id(), participant.nickname());
    }
}
