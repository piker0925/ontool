package com.back.game.dto;

import com.back.game.entity.RankedParticipant;

public record RoomRoundResultEntry(String participantId, String nickname, int rank, boolean falseStart, Long elapsedMs) {
    public static RoomRoundResultEntry of(RankedParticipant ranked, String nickname) {
        return new RoomRoundResultEntry(ranked.participantId(), nickname, ranked.rank(), ranked.falseStart(), ranked.elapsedMs());
    }
}
