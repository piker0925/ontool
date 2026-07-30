package com.back.game.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record RoomDinoProgressRequest(
        @NotBlank(message = "participantId는 필수입니다.") String participantId,
        @NotBlank(message = "roomSessionToken은 필수입니다.") String roomSessionToken,
        int score,
        @JsonProperty("isAlive") boolean isAlive,
        int dinoY,
        @JsonProperty("isJumping") boolean isJumping,
        @JsonProperty("isDucking") boolean isDucking
) {
}
