package com.back.game.controller;

import com.back.game.dto.RoomClickRequest;
import com.back.game.dto.RoomCreateResponse;
import com.back.game.dto.RoomJoinRequest;
import com.back.game.dto.RoomJoinResponse;
import com.back.game.dto.RoomRoundResultEntry;
import com.back.game.dto.RoomStartRequest;
import com.back.game.dto.RoomStartResponse;
import com.back.game.service.RoomBroadcaster;
import com.back.game.service.RoomRateLimiter;
import com.back.game.service.RoomService;
import com.back.global.ratelimit.ClientIpResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

// 193: 반응속도 대결 멀티플레이 파일럿 — 방 생명주기(생성/입장/실시간 로비)는 서버 메모리에서만
// 관리한다(신규 DB 테이블 없음). 게임 하나(gameId)에 종속된 방이라 기존 게임 경로 아래 중첩한다.
@RestController
@RequestMapping("/api/v1/games/{gameId}/rooms")
@RequiredArgsConstructor
@Tag(name = "게임 방 (Game Room)", description = "멀티플레이어 방 생성·입장·실시간 로비 API")
public class RoomController {

    private final RoomService roomService;
    private final RoomRateLimiter roomRateLimiter;
    private final RoomBroadcaster roomBroadcaster;

    @Operation(summary = "방 생성", description = "멀티플레이 방을 만들고 공유 가능한 4자리 코드를 발급합니다. 로그인 없이도 호출 가능합니다.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomCreateResponse createRoom(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                          HttpServletRequest request) {
        roomRateLimiter.assertNotLimited(ClientIpResolver.resolve(request));
        return roomService.createRoom(gameId);
    }

    @Operation(summary = "대기중인 방 목록", description = "코드 입력 없이 고를 수 있도록, 아직 시작하지 않고 정원도 안 찬 공개방 목록을 반환합니다.")
    @GetMapping
    public List<com.back.game.dto.RoomSummaryResponse> list(@Parameter(description = "게임 ID") @PathVariable String gameId) {
        return roomService.listRooms(gameId);
    }

    @Operation(summary = "방 입장", description = "코드로 방에 입장합니다. 로그인 없이도 가능하며, 비로그인 참가자는 요청에 담긴 닉네임을 사용합니다.")
    @PostMapping("/{code}/join")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomJoinResponse join(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                  @Parameter(description = "방 코드") @PathVariable String code,
                                  @RequestBody(required = false) @Valid RoomJoinRequest request,
                                  @AuthenticationPrincipal Long userId) {
        String requestedNickname = request != null ? request.nickname() : null;
        return roomService.join(gameId, code, userId, requestedNickname);
    }

    @Operation(summary = "라운드 시작", description = "방장만 시작할 수 있습니다. 성공하면 방에 연결된 모든 참가자에게 GO 신호를 브로드캐스트합니다.")
    @PostMapping("/{code}/start")
    public RoomStartResponse start(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                    @Parameter(description = "방 코드") @PathVariable String code,
                                    @RequestBody @Valid RoomStartRequest request) {
        return roomService.startRound(gameId, code, request.participantId(), request.roomSessionToken());
    }

    @Operation(summary = "다음 라운드", description = "방장만 트리거할 수 있습니다. 방을 새로 만들지 않고 같은 참가자 구성으로 재대결합니다(이전 클릭·승리기록 초기화, 새 GO 신호 브로드캐스트).")
    @PostMapping("/{code}/next-round")
    public RoomStartResponse nextRound(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                        @Parameter(description = "방 코드") @PathVariable String code,
                                        @RequestBody @Valid RoomStartRequest request) {
        return roomService.nextRound(gameId, code, request.participantId(), request.roomSessionToken());
    }

    @Operation(summary = "클릭 제출", description = "서버가 기록한 도착 시각으로 순위를 매깁니다(클라이언트 자체 신고 불신). 매 제출마다 갱신된 순위가 방 전체에 브로드캐스트됩니다.")
    @PostMapping("/{code}/click")
    public List<RoomRoundResultEntry> click(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                             @Parameter(description = "방 코드") @PathVariable String code,
                                             @RequestBody @Valid RoomClickRequest request) {
        return roomService.submitClick(gameId, code, request.participantId(), request.roomSessionToken());
    }

    @Operation(summary = "코드레인 단어 선점", description = "Dev Code Rain Typing 5인 뺏어치기 단어 제출. 선점 및 콤보 공격 결과가 방 전체에 SSE로 푸시됩니다.")
    @PostMapping("/{code}/claim-word")
    public com.back.game.dto.RoomCodeRainClaimResponse claimWord(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                                                 @Parameter(description = "방 코드") @PathVariable String code,
                                                                 @RequestBody @Valid com.back.game.dto.RoomClaimWordRequest request) {
        return roomService.claimCodeRainWord(gameId, code, request.participantId(), request.roomSessionToken(), request.wordId(), request.wordText());
    }

    @Operation(summary = "테트리스 라인 삭제 제출", description = "2줄 이상 클리어 시 방해 블록(Garbage Line) 공격을 방 전체에 SSE로 푸시합니다.")
    @PostMapping("/{code}/clear-lines")
    public com.back.game.dto.RoomTetrisGarbageAttackResponse clearLines(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                                                         @Parameter(description = "방 코드") @PathVariable String code,
                                                                         @RequestBody @Valid com.back.game.dto.RoomTetrisClearRequest request) {
        return roomService.clearTetrisLines(gameId, code, request.participantId(), request.roomSessionToken(), request.clearedLineCount());
    }

    @Operation(summary = "오목 착수 제출", description = "15x15 오목판 턴제 착수 제출. 턴 타이머 및 착수 결과가 방 전체에 SSE로 푸시됩니다.")
    @PostMapping("/{code}/place-stone")
    public com.back.game.dto.RoomOmokMoveResponse placeStone(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                                             @Parameter(description = "방 코드") @PathVariable String code,
                                                             @RequestBody @Valid com.back.game.dto.RoomOmokPlaceRequest request) {
        return roomService.placeOmokStone(gameId, code, request.participantId(), request.roomSessionToken(), request.x(), request.y());
    }

    @Operation(summary = "공룡 게임 실시간 진행 상황 제출", description = "공룡 위치/점수/생존 여부를 제출하여 방 전체 참가자에게 SSE로 실시간 중계합니다.")
    @PostMapping("/{code}/dino-progress")
    public com.back.game.dto.RoomDinoProgressResponse reportDinoProgress(@Parameter(description = "게임 ID") @PathVariable String gameId,
                                                                         @Parameter(description = "방 코드") @PathVariable String code,
                                                                         @RequestBody @Valid com.back.game.dto.RoomDinoProgressRequest request) {
        return roomService.reportDinoProgress(gameId, code, request);
    }

    @Operation(summary = "방 로비 실시간 스트림(SSE)", description = "참가자 입장 등 방 상태 변화를 실시간으로 푸시합니다.")
    @GetMapping(value = "/{code}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@Parameter(description = "게임 ID") @PathVariable String gameId,
                              @Parameter(description = "방 코드") @PathVariable String code) {
        return roomBroadcaster.subscribe(code);
    }
}
