package com.back.personalization.dto;

import java.util.List;

public record PersonalizationMergeRequest(
        List<String> favorites,
        List<String> recentTools,
        List<String> likes
) {
    public PersonalizationMergeRequest {
        favorites = favorites == null ? List.of() : favorites;
        recentTools = recentTools == null ? List.of() : recentTools;
        likes = likes == null ? List.of() : likes;
    }
}
