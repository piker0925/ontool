package com.back.game.dto;

import jakarta.validation.constraints.NotBlank;

public record GameScoreSubmitRequest(int score, @NotBlank String sessionToken) {
}
