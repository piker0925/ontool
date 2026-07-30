package com.back.game.dto;

public record RoomCodeRainClaimResponse(
        String participantId,
        String nickname,
        long wordId,
        String wordText,
        int score,
        int comboCount,
        boolean attackTriggered,
        String attackWord
) {
}
