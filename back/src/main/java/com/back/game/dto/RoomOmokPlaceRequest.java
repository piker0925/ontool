package com.back.game.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record RoomOmokPlaceRequest(
        @NotBlank(message = "participantId는 필수입니다.") String participantId,
        @NotBlank(message = "roomSessionToken은 필수입니다.") String roomSessionToken,
        @Min(value = 0, message = "x는 0 이상이어야 합니다.") @Max(value = 14, message = "x는 14 이하이어야 합니다.") int x,
        @Min(value = 0, message = "y는 0 이상이어야 합니다.") @Max(value = 14, message = "y는 14 이하이어야 합니다.") int y
) {
}
