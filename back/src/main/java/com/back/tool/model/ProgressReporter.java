package com.back.tool.model;

/**
 * 처리 중간에 진행률(0~100)을 보고하는 통로. 기본은 {@link #NOOP} — 진행 보고가 필요 없는 모듈은
 * {@code ToolInput}의 2-args 생성자를 그대로 쓰면 이 값이 자동으로 채워진다(037).
 */
@FunctionalInterface
public interface ProgressReporter {

    ProgressReporter NOOP = progress -> { };

    void report(int progress);
}
