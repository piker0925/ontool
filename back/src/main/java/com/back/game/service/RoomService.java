package com.back.game.service;

import com.back.game.dto.RoomCreateResponse;
import com.back.game.dto.RoomJoinResponse;
import com.back.game.dto.RoomParticipantResponse;
import com.back.game.dto.RoomRoundResultEntry;
import com.back.game.dto.RoomStartResponse;
import com.back.game.entity.GameCatalog;
import com.back.game.entity.Participant;
import com.back.game.entity.RankedParticipant;
import com.back.game.entity.Room;
import com.back.game.entity.RoomWin;
import com.back.game.repository.RoomWinRepository;
import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRegistry roomRegistry;
    private final UserRepository userRepository;
    private final GameSessionTokenService sessionTokenService;
    private final RoomBroadcaster roomBroadcaster;
    private final RoomWinRepository roomWinRepository;

    public RoomCreateResponse createRoom(String gameId) {
        requireGame(gameId);
        Room room = roomRegistry.create();
        return new RoomCreateResponse(room.code());
    }

    // 로그인 유저는 실제 계정 닉네임으로 강제된다 — requestedNickname은 게스트일 때만 반영된다
    // (신원 위장 방지, 193 결정 사항).
    public RoomJoinResponse join(String gameId, String code, Long userId, String requestedNickname) {
        requireGame(gameId);
        String nickname = userId != null ? nicknameOf(userId) : requestedNickname;
        Participant participant = new Participant(UUID.randomUUID().toString(), nickname, userId);

        Room room = roomRegistry.join(code, participant);
        List<RoomParticipantResponse> participants = room.participants().stream().map(RoomParticipantResponse::from).toList();
        roomBroadcaster.broadcast(room.code(), "participant-joined", participants);

        String roomSessionToken = sessionTokenService.issueForRoom(gameId, room.code(), participant.id());
        return new RoomJoinResponse(room.code(), participant.id(), participant.nickname(), roomSessionToken, participants);
    }

    // 방장 판정에 앞서 토큰부터 검증한다 — 남의 participantId를 대며 시작을 시도하는 걸 막는다.
    public RoomStartResponse startRound(String gameId, String code, String participantId, String roomSessionToken) {
        if (!sessionTokenService.verifyForRoom(roomSessionToken, gameId, code, participantId)) {
            throw new AppException(ErrorCode.GAME_SESSION_INVALID);
        }
        Instant goAt = roomRegistry.startRound(code, participantId);
        roomBroadcaster.broadcast(code, "round-started", new RoomStartResponse(goAt));
        return new RoomStartResponse(goAt);
    }

    // 방을 새로 만들지 않고 재대결한다 — 같은 이벤트명("round-started")으로 브로드캐스트해 프론트가
    // 최초 시작과 동일한 방식으로 GO 화면 전환을 처리하게 한다.
    public RoomStartResponse nextRound(String gameId, String code, String participantId, String roomSessionToken) {
        if (!sessionTokenService.verifyForRoom(roomSessionToken, gameId, code, participantId)) {
            throw new AppException(ErrorCode.GAME_SESSION_INVALID);
        }
        Instant goAt = roomRegistry.nextRound(code, participantId);
        roomBroadcaster.broadcast(code, "round-started", new RoomStartResponse(goAt));
        return new RoomStartResponse(goAt);
    }

    // 클릭마다 지금까지의 순위를 다시 계산해 방 전체에 브로드캐스트한다 — 전원이 클릭하면 그 결과가
    // 자연히 "최종" 결과가 된다(별도 "라운드 종료" 신호 없음, 193 결정 사항).
    public List<RoomRoundResultEntry> submitClick(String gameId, String code, String participantId, String roomSessionToken) {
        if (!sessionTokenService.verifyForRoom(roomSessionToken, gameId, code, participantId)) {
            throw new AppException(ErrorCode.GAME_SESSION_INVALID);
        }
        Room room = roomRegistry.recordClick(code, participantId, Instant.now());

        List<RankedParticipant> ranked = RoundJudge.rank(room.goAt(), room.clicks(), room.participantOrder());
        Map<String, Participant> byId = room.participants().stream().collect(Collectors.toMap(Participant::id, p -> p));
        List<RoomRoundResultEntry> results = ranked.stream()
                .map(r -> RoomRoundResultEntry.of(r, byId.get(r.participantId()).nickname()))
                .toList();

        recordWinIfRoundComplete(gameId, room, ranked, byId);
        roomBroadcaster.broadcast(code, "round-result", results);
        return results;
    }

    private void recordWinIfRoundComplete(String gameId, Room room, List<RankedParticipant> ranked, Map<String, Participant> byId) {
        if (ranked.size() != room.participants().size() || ranked.isEmpty()) {
            return;
        }
        RankedParticipant winner = ranked.get(0);
        if (winner.falseStart()) {
            return;
        }
        Long winnerUserId = byId.get(winner.participantId()).userId();
        if (winnerUserId != null && room.markWinRecordedIfAbsent()) {
            roomWinRepository.save(new RoomWin(gameId, winnerUserId));
        }
    }

    private String nicknameOf(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return user.getNickname();
    }

    private void requireGame(String gameId) {
        GameCatalog.find(gameId).orElseThrow(() -> new AppException(ErrorCode.GAME_NOT_FOUND));
    }
}
