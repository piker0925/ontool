package com.back.game.service;

import com.back.game.entity.Participant;
import com.back.game.entity.Room;
import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoomRegistryTest {

    @Test
    void 방을_생성하면_고유_코드와_빈_참가자_목록을_받는다() {
        RoomRegistry registry = new RoomRegistry();

        Room room = registry.create("game-reaction-time");

        assertThat(room.code()).isNotBlank();
        assertThat(room.participants()).isEmpty();
    }

    @Test
    void 방_코드는_공유하기_쉬운_4자리_숫자다() {
        RoomRegistry registry = new RoomRegistry();

        Room room = registry.create("game-reaction-time");

        assertThat(room.code()).matches("\\d{4}");
    }

    @Test
    void 방을_생성하면_생성_시_지정한_gameId를_저장한다() {
        RoomRegistry registry = new RoomRegistry();

        Room room = registry.create("game-omok");

        assertThat(room.gameId()).isEqualTo("game-omok");
    }

    @Test
    void 참가자가_코드로_입장하면_참가자_목록에_추가된다() {
        RoomRegistry registry = new RoomRegistry();
        Room created = registry.create("game-reaction-time");
        Participant participant = new Participant("p1", "닉네임1", null);

        Room joined = registry.join(created.code(), participant);

        assertThat(joined.participants()).containsExactly(participant);
    }

    @Test
    void 존재하지_않는_코드로_입장하면_ROOM_NOT_FOUND_예외() {
        RoomRegistry registry = new RoomRegistry();

        assertThatThrownBy(() -> registry.join("0000", new Participant("p1", "닉네임1", null)))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    void 참가자_상한을_넘겨_입장하면_ROOM_FULL_예외() {
        // 남용 방지용 기술적 상한(8명) — 제품상 정원 설정 UI가 아니라 순수 안전장치.
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        for (int i = 0; i < 8; i++) {
            registry.join(room.code(), new Participant("p" + i, "닉네임" + i, null));
        }

        assertThatThrownBy(() -> registry.join(room.code(), new Participant("p9", "닉네임9", null)))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_FULL);
    }

    @Test
    void 가장_먼저_입장한_참가자가_라운드를_시작하면_시작_시각을_받는다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        Participant host = new Participant("host", "방장", null);
        registry.join(room.code(), host);

        Instant goAt = registry.startRound(room.code(), host.id());

        assertThat(goAt).isNotNull();
    }

    @Test
    void 방장이_아닌_참가자가_시작하면_ROOM_NOT_HOST_예외() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        registry.join(room.code(), new Participant("host", "방장", null));
        registry.join(room.code(), new Participant("guest", "게스트", null));

        assertThatThrownBy(() -> registry.startRound(room.code(), "guest"))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_NOT_HOST);
    }

    @Test
    void 이미_시작된_방을_다시_시작하면_ROOM_ALREADY_STARTED_예외() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        registry.join(room.code(), new Participant("host", "방장", null));
        registry.startRound(room.code(), "host");

        assertThatThrownBy(() -> registry.startRound(room.code(), "host"))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_ALREADY_STARTED);
    }

    @Test
    void 시작된_방에는_새_참가자가_입장할_수_없다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        registry.join(room.code(), new Participant("host", "방장", null));
        registry.startRound(room.code(), "host");

        assertThatThrownBy(() -> registry.join(room.code(), new Participant("late", "지각생", null)))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_ALREADY_STARTED);
    }

    @Test
    void 방장이_다음_라운드를_트리거하면_새_GO_시각을_받고_이전_클릭_기록이_초기화된다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        registry.join(room.code(), new Participant("host", "방장", null));
        Instant firstGoAt = registry.startRound(room.code(), "host");
        registry.recordClick(room.code(), "host", firstGoAt.plusMillis(100));

        Instant secondGoAt = registry.nextRound(room.code(), "host");

        assertThat(secondGoAt).isNotNull().isNotEqualTo(firstGoAt);
        assertThat(room.clicks()).isEmpty();
    }

    @Test
    void 아직_시작하지_않은_방에서_다음_라운드를_트리거하면_ROOM_NOT_STARTED_예외() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        registry.join(room.code(), new Participant("host", "방장", null));

        assertThatThrownBy(() -> registry.nextRound(room.code(), "host"))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_NOT_STARTED);
    }

    @Test
    void 방장이_아닌_참가자가_다음_라운드를_트리거하면_ROOM_NOT_HOST_예외() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        registry.join(room.code(), new Participant("host", "방장", null));
        registry.join(room.code(), new Participant("guest", "게스트", null));
        registry.startRound(room.code(), "host");

        assertThatThrownBy(() -> registry.nextRound(room.code(), "guest"))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_NOT_HOST);
    }

    @Test
    void 방금_생성된_빈_방은_아직_유휴로_판정되지_않는다() {
        // 방 생성 직후(호스트가 곧 입장할 예정)를 즉시 지워버리면 안 된다 — 생성도 활동으로 친다.
        RoomRegistry registry = new RoomRegistry();
        registry.create("game-reaction-time");

        int removed = registry.removeIdleRooms(Instant.now(), Duration.ofMinutes(5));

        assertThat(removed).isZero();
    }

    @Test
    void 생성_후_타임아웃이_지나면_참가자가_없어도_유휴로_판정돼_정리된다() {
        RoomRegistry registry = new RoomRegistry();
        registry.create("game-reaction-time");

        Instant farFuture = Instant.now().plus(Duration.ofMinutes(10));
        int removed = registry.removeIdleRooms(farFuture, Duration.ofMinutes(5));

        assertThat(removed).isEqualTo(1);
    }

    @Test
    void 참가자가_있고_최근에_활동한_방은_유휴로_판정되지_않는다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        registry.join(room.code(), new Participant("host", "방장", null));

        int removed = registry.removeIdleRooms(Instant.now(), Duration.ofMinutes(5));

        assertThat(removed).isZero();
        assertThat(registry.join(room.code(), new Participant("p2", "참가자2", null))).isNotNull(); // 여전히 존재
    }

    @Test
    void 참가자가_있어도_마지막_활동_후_타임아웃이_지나면_유휴로_판정된다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        registry.join(room.code(), new Participant("host", "방장", null));

        // 활동 시각(입장) 기준으로 5분 타임아웃을 훌쩍 넘긴 미래 시각으로 "지금"을 가정한다.
        Instant farFuture = Instant.now().plus(Duration.ofMinutes(10));
        int removed = registry.removeIdleRooms(farFuture, Duration.ofMinutes(5));

        assertThat(removed).isEqualTo(1);
        assertThatThrownBy(() -> registry.join(room.code(), new Participant("late", "지각생", null)))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    void 대기중인_방_목록은_지정한_gameId의_방만_보여준다() {
        RoomRegistry registry = new RoomRegistry();
        Room reactionRoom = registry.create("game-reaction-time");
        registry.create("game-omok");

        assertThat(registry.listWaitingRooms("game-reaction-time"))
                .extracting(Room::code)
                .containsExactly(reactionRoom.code());
    }

    @Test
    void 이미_시작된_방은_대기중인_방_목록에_보이지_않는다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        registry.join(room.code(), new Participant("host", "방장", null));
        registry.startRound(room.code(), "host");

        assertThat(registry.listWaitingRooms("game-reaction-time")).isEmpty();
    }

    @Test
    void 정원이_찬_방은_대기중인_방_목록에_보이지_않는다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        for (int i = 0; i < 8; i++) {
            registry.join(room.code(), new Participant("p" + i, "닉네임" + i, null));
        }

        assertThat(registry.listWaitingRooms("game-reaction-time")).isEmpty();
    }

    @Test
    void 참가자가_퇴장해_0명이_되면_방이_즉시_해제된다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = registry.create("game-reaction-time");
        Participant host = new Participant("host", "방장", null);
        registry.join(room.code(), host);

        Room leftRoom = registry.leave(room.code(), host.id());

        assertThat(leftRoom).isNull();
        assertThat(registry.listWaitingRooms("game-reaction-time")).isEmpty();
    }
}
