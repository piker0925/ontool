package com.back.game.entity;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 193 파일럿의 방(Room) 상태 — DB에 저장하지 않는다(단일 백엔드 인스턴스 전제, ADR-0021과 동일 전제).
 * 여러 요청이 동시에 입장을 시도할 수 있어 참가자 목록은 스레드 세이프해야 한다.
 */
public class Room {

    // 정원 설정 UI는 만들지 않는다(제품 정책 아님) — 남용 방지용 순수 기술적 상한.
    private static final int MAX_PARTICIPANTS = 8;

    private final String code;
    private final List<Participant> participants = new CopyOnWriteArrayList<>();
    private volatile boolean started = false;
    private volatile Instant goAt;
    private final Map<String, Instant> clicks = new ConcurrentHashMap<>();
    private final AtomicBoolean winRecorded = new AtomicBoolean(false);
    private volatile Instant lastActivityAt;

    public Room(String code) {
        this.code = code;
        this.lastActivityAt = Instant.now(); // 생성 자체도 활동으로 친다 — 갓 만든 빈 방을 바로 지우지 않기 위함
    }

    public String code() {
        return code;
    }

    public List<Participant> participants() {
        return List.copyOf(participants);
    }

    public void addParticipant(Participant participant) {
        if (started) {
            throw new AppException(ErrorCode.ROOM_ALREADY_STARTED);
        }
        if (participants.size() >= MAX_PARTICIPANTS) {
            throw new AppException(ErrorCode.ROOM_FULL);
        }
        participants.add(participant);
        lastActivityAt = Instant.now();
    }

    // 방장 = 가장 먼저 입장한 참가자. 별도 "방장" 필드를 두지 않고 참가자 목록의 순서 자체로 판정한다.
    public boolean isHost(String participantId) {
        return !participants.isEmpty() && participants.get(0).id().equals(participantId);
    }

    public Instant startRound(String participantId) {
        if (!isHost(participantId)) {
            throw new AppException(ErrorCode.ROOM_NOT_HOST);
        }
        if (started) {
            throw new AppException(ErrorCode.ROOM_ALREADY_STARTED);
        }
        started = true;
        goAt = Instant.now();
        lastActivityAt = goAt;
        return goAt;
    }

    public boolean isStarted() {
        return started;
    }

    // 방을 새로 만들지 않고 같은 참가자 구성으로 재대결한다 — started는 계속 true로 두고
    // (신규 입장은 계속 막힌 채) 라운드별 상태(클릭·승리기록·GO 시각)만 초기화한다.
    public Instant nextRound(String participantId) {
        if (!isHost(participantId)) {
            throw new AppException(ErrorCode.ROOM_NOT_HOST);
        }
        if (!started) {
            throw new AppException(ErrorCode.ROOM_NOT_STARTED);
        }
        clicks.clear();
        winRecorded.set(false);
        goAt = Instant.now();
        lastActivityAt = goAt;
        return goAt;
    }

    public Instant goAt() {
        return goAt;
    }

    // 같은 참가자가 중복 제출해도 최초 도착 시각만 기록한다(putIfAbsent) — 재전송·더블클릭 방어.
    public void recordClick(String participantId, Instant arrivedAt) {
        if (!started) {
            throw new AppException(ErrorCode.ROOM_NOT_STARTED);
        }
        clicks.putIfAbsent(participantId, arrivedAt);
        lastActivityAt = Instant.now();
    }

    public boolean isIdle(Instant now, Duration timeout) {
        return Duration.between(lastActivityAt, now).compareTo(timeout) >= 0;
    }

    public List<ClickEvent> clicks() {
        return clicks.entrySet().stream().map(e -> new ClickEvent(e.getKey(), e.getValue())).toList();
    }

    public List<String> participantOrder() {
        return participants.stream().map(Participant::id).toList();
    }

    /** 이 방에서 승리 기록을 아직 남기지 않았다면 원자적으로 남긴 것으로 표시하고 true를 반환한다.
     * 클릭마다 순위를 재계산·재브로드캐스트하는 구조라, 라운드 완료 판정을 여러 번 통과해도
     * 승리 기록이 중복 저장되지 않도록 막는 용도다. */
    public boolean markWinRecordedIfAbsent() {
        return winRecorded.compareAndSet(false, true);
    }
}
