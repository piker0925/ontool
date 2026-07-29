package com.back.game.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.game.dto.RoomCreateResponse;
import com.back.game.service.RoomService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import java.util.concurrent.LinkedBlockingQueue;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000",
        // 로비 SSE는 원래 오래 열려있는 연결이라 테스트가 끝나도 자연 종료되지 않는다 —
        // 기본 graceful shutdown 유예(30초)를 그대로 두면 컨텍스트 종료 때마다 그만큼 느려진다.
        "spring.lifecycle.timeout-per-shutdown-phase=2s"
})
class RoomSseTest extends AbstractMySQLIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    RoomService roomService;

    @Test
    void 참가자가_입장하면_이미_연결된_로비_스트림에_실시간으로_전달된다() throws Exception {
        RoomCreateResponse room = roomService.createRoom("game-reaction-time");

        LinkedBlockingQueue<String> lines = new LinkedBlockingQueue<>();
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest streamRequest = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/v1/games/game-reaction-time/rooms/" + room.code() + "/stream"))
                .header("Accept", "text/event-stream")
                .GET()
                .build();

        LineCollector collector = new LineCollector(lines);
        CompletableFuture<HttpResponse<Void>> streamFuture = client.sendAsync(streamRequest,
                HttpResponse.BodyHandlers.fromLineSubscriber(collector));

        try {
            // 스트림 연결(구독)이 서버에 실제로 등록될 시간을 준다 — 등록 전에 입장하면 이벤트를 놓친다.
            Thread.sleep(300);

            roomService.join("game-reaction-time", room.code(), null, "실시간참가자");

            String eventLine = pollUntilContains(lines, "participant-joined", Duration.ofSeconds(5));
            assertThat(eventLine).isNotNull();
            String dataLine = pollUntilContains(lines, "실시간참가자", Duration.ofSeconds(5));
            assertThat(dataLine).isNotNull();
        } finally {
            // Subscription을 직접 취소해야 서버가 연결 종료를 즉시 감지한다 — future.cancel(true)만으로는
            // 서버 쪽 비동기 요청이 정리되지 않고 async-request-timeout(기본 30초)까지 남아있는다.
            collector.cancelSubscription();
            streamFuture.cancel(true);
        }
    }

    @Test
    void 방장이_라운드를_시작하면_연결된_모든_참가자에게_GO_이벤트가_동시에_전달된다() throws Exception {
        RoomCreateResponse room = roomService.createRoom("game-reaction-time");
        var host = roomService.join("game-reaction-time", room.code(), null, "방장");
        var guest = roomService.join("game-reaction-time", room.code(), null, "참가자2");

        LinkedBlockingQueue<String> hostLines = new LinkedBlockingQueue<>();
        LinkedBlockingQueue<String> guestLines = new LinkedBlockingQueue<>();
        LineCollector hostCollector = new LineCollector(hostLines);
        LineCollector guestCollector = new LineCollector(guestLines);
        HttpClient client = HttpClient.newHttpClient();
        String streamUrl = "http://localhost:" + port + "/api/v1/games/game-reaction-time/rooms/" + room.code() + "/stream";

        CompletableFuture<HttpResponse<Void>> hostStream = client.sendAsync(
                HttpRequest.newBuilder().uri(URI.create(streamUrl)).header("Accept", "text/event-stream").GET().build(),
                HttpResponse.BodyHandlers.fromLineSubscriber(hostCollector));
        CompletableFuture<HttpResponse<Void>> guestStream = client.sendAsync(
                HttpRequest.newBuilder().uri(URI.create(streamUrl)).header("Accept", "text/event-stream").GET().build(),
                HttpResponse.BodyHandlers.fromLineSubscriber(guestCollector));

        try {
            Thread.sleep(300); // 두 스트림 모두 서버에 실제로 구독 등록될 시간

            roomService.startRound("game-reaction-time", room.code(), host.participantId(), host.roomSessionToken());

            assertThat(pollUntilContains(hostLines, "round-started", Duration.ofSeconds(5))).isNotNull();
            assertThat(pollUntilContains(guestLines, "round-started", Duration.ofSeconds(5))).isNotNull();
        } finally {
            hostCollector.cancelSubscription();
            guestCollector.cancelSubscription();
            hostStream.cancel(true);
            guestStream.cancel(true);
        }
    }

    @Test
    void 참가자가_클릭하면_연결된_모든_참가자에게_순위_결과가_전달된다() throws Exception {
        RoomCreateResponse room = roomService.createRoom("game-reaction-time");
        var host = roomService.join("game-reaction-time", room.code(), null, "방장");
        var guest = roomService.join("game-reaction-time", room.code(), null, "참가자2");
        roomService.startRound("game-reaction-time", room.code(), host.participantId(), host.roomSessionToken());

        LinkedBlockingQueue<String> hostLines = new LinkedBlockingQueue<>();
        LinkedBlockingQueue<String> guestLines = new LinkedBlockingQueue<>();
        LineCollector hostCollector = new LineCollector(hostLines);
        LineCollector guestCollector = new LineCollector(guestLines);
        HttpClient client = HttpClient.newHttpClient();
        String streamUrl = "http://localhost:" + port + "/api/v1/games/game-reaction-time/rooms/" + room.code() + "/stream";

        CompletableFuture<HttpResponse<Void>> hostStream = client.sendAsync(
                HttpRequest.newBuilder().uri(URI.create(streamUrl)).header("Accept", "text/event-stream").GET().build(),
                HttpResponse.BodyHandlers.fromLineSubscriber(hostCollector));
        CompletableFuture<HttpResponse<Void>> guestStream = client.sendAsync(
                HttpRequest.newBuilder().uri(URI.create(streamUrl)).header("Accept", "text/event-stream").GET().build(),
                HttpResponse.BodyHandlers.fromLineSubscriber(guestCollector));

        try {
            Thread.sleep(300);

            roomService.submitClick("game-reaction-time", room.code(), guest.participantId(), guest.roomSessionToken());

            assertThat(pollUntilContains(hostLines, "round-result", Duration.ofSeconds(5))).isNotNull();
            assertThat(pollUntilContains(guestLines, "round-result", Duration.ofSeconds(5))).isNotNull();
        } finally {
            hostCollector.cancelSubscription();
            guestCollector.cancelSubscription();
            hostStream.cancel(true);
            guestStream.cancel(true);
        }
    }

    private String pollUntilContains(LinkedBlockingQueue<String> lines, String needle, Duration timeout) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeout.toMillis();
        while (System.currentTimeMillis() < deadline) {
            String line = lines.poll(200, java.util.concurrent.TimeUnit.MILLISECONDS);
            if (line != null && line.contains(needle)) {
                return line;
            }
        }
        return null;
    }

    /** 응답 본문을 줄 단위로 큐에 쌓기만 하는 구독자 — 스트림이 끝나기를 기다리지 않고 실시간으로 소비한다. */
    private static final class LineCollector implements Flow.Subscriber<String> {
        private final LinkedBlockingQueue<String> lines;
        private volatile Flow.Subscription subscription;

        private LineCollector(LinkedBlockingQueue<String> lines) {
            this.lines = lines;
        }

        void cancelSubscription() {
            if (subscription != null) {
                subscription.cancel();
            }
        }

        @Override
        public void onSubscribe(Flow.Subscription subscription) {
            this.subscription = subscription;
            subscription.request(Long.MAX_VALUE);
        }

        @Override
        public void onNext(String item) {
            lines.offer(item);
        }

        @Override
        public void onError(Throwable throwable) {
            // 테스트 종료 시 구독 취소로 발생하는 에러는 무시한다.
        }

        @Override
        public void onComplete() {
        }
    }
}
