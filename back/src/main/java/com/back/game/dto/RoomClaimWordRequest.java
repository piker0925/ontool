package com.back.game.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RoomClaimWordRequest(
        @NotBlank(message = "participantId는 필수입니다.") String participantId,
        @NotBlank(message = "roomSessionToken은 필수입니다.") String roomSessionToken,
        @NotNull(message = "wordId는 필수입니다.") Long wordId,
        @NotBlank(message = "wordText는 필수입니다.") String wordText
) {
}
