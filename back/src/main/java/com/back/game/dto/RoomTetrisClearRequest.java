package com.back.game.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record RoomTetrisClearRequest(
        @NotBlank(message = "participantId는 필수입니다.") String participantId,
        @NotBlank(message = "roomSessionToken은 필수입니다.") String roomSessionToken,
        @Min(value = 1, message = "clearedLineCount는 1 이상이어야 합니다.") int clearedLineCount
) {
}
