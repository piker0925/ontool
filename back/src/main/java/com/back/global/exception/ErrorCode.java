package com.back.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    JOB_NOT_FOUND(HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다."),
    FILE_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "파일 크기가 제한을 초과합니다."),
    UNSUPPORTED_FILE_TYPE(HttpStatus.BAD_REQUEST, "지원하지 않는 파일 형식입니다."),
    MODULE_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 도구입니다."),
    INVALID_MODULE_TYPE(HttpStatus.BAD_REQUEST, "이 경로에서 사용할 수 없는 도구 유형입니다."),
    QUOTA_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "동시에 처리 중인 작업이 너무 많습니다. 잠시 후 다시 시도해 주세요."),
    STORAGE_FULL(HttpStatus.INSUFFICIENT_STORAGE, "저장 공간이 부족합니다. 잠시 후 다시 시도해 주세요."),
    QUEUE_FULL(HttpStatus.SERVICE_UNAVAILABLE, "처리 대기열이 가득 찼습니다. 잠시 후 다시 시도해 주세요."),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "요청이 너무 많습니다. 1분 후 다시 시도해 주세요."),
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "로그인이 만료되었습니다. 다시 로그인해 주세요."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");

    private final HttpStatus status;
    private final String message;
}
