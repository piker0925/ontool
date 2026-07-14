package com.back.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    JOB_NOT_FOUND(HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다."),
    FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "파일 크기가 제한을 초과합니다."),
    UNSUPPORTED_FILE_TYPE(HttpStatus.BAD_REQUEST, "지원하지 않는 파일 형식입니다."),
    MODULE_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 도구입니다."),
    INVALID_MODULE_TYPE(HttpStatus.BAD_REQUEST, "이 경로에서 사용할 수 없는 도구 유형입니다."),
    QUOTA_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "동시에 처리 중인 작업이 너무 많습니다. 잠시 후 다시 시도해 주세요."),
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String message;
}
