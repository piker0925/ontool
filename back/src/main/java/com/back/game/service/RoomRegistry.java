package com.back.game.service;

import com.back.game.entity.Participant;
import com.back.game.entity.Room;
import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 193 파일럿 — 방 생명주기를 서버 메모리에서만 관리한다(신규 DB 테이블 없음).
 */
@Component
public class RoomRegistry {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    public Room create() {
        String code = generateUnusedCode();
        Room room = new Room(code);
        rooms.put(code, room);
        return room;
    }

    public Room join(String code, Participant participant) {
        Room room = rooms.get(code);
        if (room == null) {
            throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        }
        room.addParticipant(participant);
        return room;
    }

    public Instant startRound(String code, String participantId) {
        Room room = rooms.get(code);
        if (room == null) {
            throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        }
        return room.startRound(participantId);
    }

    public Room recordClick(String code, String participantId, Instant arrivedAt) {
        Room room = rooms.get(code);
        if (room == null) {
            throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        }
        room.recordClick(participantId, arrivedAt);
        return room;
    }

    public Instant nextRound(String code, String participantId) {
        Room room = rooms.get(code);
        if (room == null) {
            throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        }
        return room.nextRound(participantId);
    }

    /** 유휴 방(참가자 유무와 무관하게 마지막 활동으로부터 timeout 경과)을 정리하고 제거한 개수를 반환한다. */
    public int removeIdleRooms(Instant now, Duration timeout) {
        int before = rooms.size();
        rooms.values().removeIf(room -> room.isIdle(now, timeout));
        return before - rooms.size();
    }

    // 사람이 말로 불러주기 쉬운 4자리 숫자 코드. 충돌하면(같은 코드의 방이 이미 활성 상태) 다시 뽑는다.
    private String generateUnusedCode() {
        String code;
        do {
            code = String.format("%04d", RANDOM.nextInt(10_000));
        } while (rooms.containsKey(code));
        return code;
    }
}
