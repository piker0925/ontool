package com.back.game.service;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 193 파일럿 — 방 로비 실시간 브로드캐스트. 기존 SSE(JobController.stream)는 요청 1건당 이미터
 * 1개가 자기 상태를 폴링하는 구조라 "한 방의 여러 참가자에게 동시에 push"할 방법이 없다.
 * 이 클래스가 그 최초의 예외: 방 코드 → 연결된 이미터 목록을 들고 있다가, 방 상태가 바뀌면
 * 연결된 모두에게 즉시 밀어준다.
 */
@Component
public class RoomBroadcaster {

    private final Map<String, List<SseEmitter>> emittersByRoom = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String roomCode) {
        SseEmitter emitter = new SseEmitter(300_000L);
        List<SseEmitter> emitters = emittersByRoom.computeIfAbsent(roomCode, k -> new CopyOnWriteArrayList<>());
        emitters.add(emitter);

        Runnable cleanup = () -> emitters.remove(emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        return emitter;
    }

    public void broadcast(String roomCode, String eventName, Object payload) {
        List<SseEmitter> emitters = emittersByRoom.getOrDefault(roomCode, List.of());
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(payload, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                emitter.complete();
            }
        }
    }
}
