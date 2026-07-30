package com.back.game.dto;

public record RoomOmokMoveResponse(
        String participantId,
        String nickname,
        int x,
        int y,
        String nextTurnParticipantId,
        int timeRemainingSec,
        String winnerParticipantId
) {
}
