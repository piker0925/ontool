package com.back.game.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record RoomDinoProgressResponse(
        String participantId,
        String nickname,
        int score,
        @JsonProperty("isAlive") boolean isAlive,
        int dinoY,
        @JsonProperty("isJumping") boolean isJumping,
        @JsonProperty("isDucking") boolean isDucking
) {
}
