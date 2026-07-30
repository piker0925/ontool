package com.back.game.dto;

public record RoomTetrisGarbageAttackResponse(
        String attackerParticipantId,
        String attackerNickname,
        int garbageLinesAdded
) {
}
