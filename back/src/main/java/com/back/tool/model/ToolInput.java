package com.back.tool.model;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public record ToolInput(List<Path> files, Map<String, String> params, ProgressReporter progressReporter) {

    // 기존 모듈 전부가 쓰는 2-args 생성자 — progressReporter가 필요한 모듈만 3-args 생성자로 opt-in한다(037).
    public ToolInput(List<Path> files, Map<String, String> params) {
        this(files, params, ProgressReporter.NOOP);
    }
}
