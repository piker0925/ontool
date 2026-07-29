package com.back.game.dto;

import java.util.List;

public record RoomJoinResponse(
        String code,
        String participantId,
        String nickname,
        String roomSessionToken,
        List<RoomParticipantResponse> participants
) {
}
