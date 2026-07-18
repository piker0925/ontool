package com.back.personalization.dto;

import java.util.List;

public record PersonalizationResponse(
        List<String> favorites,
        List<String> recentTools,
        List<String> likes
) {
}
