package com.back.tool.model;

public interface ToolModule {
    String getId();

    String getName();

    String getCategory();

    boolean isHeavy();

    // true면 모든 파일을 단일 job으로 처리 (pdf-merge, gif-create)
    // false면 파일 1개당 별도 job (image-resize, image-format 등)
    default boolean acceptsMultipleFiles() { return false; }

    // 자원 등급 레인. 기본 HEAVY, 영상 모듈만 VIDEO로 오버라이드 (ADR-0019)
    default Lane getLane() { return Lane.HEAVY; }

    ToolResult process(ToolInput input);

    /**
     * 파일이 반드시 필요한 모듈이 process() 맨 앞에서 호출해 파일 0개 요청을 명확히 거부한다(086).
     * ToolController가 파일 0개 요청도 단건 job 생성 경로로 흘려보내므로(파일-불필요 모듈 지원),
     * 파일이 필요한 모듈은 이 가드 없이는 files.get(0) 등에서 원시 IndexOutOfBoundsException으로
     * 불명확하게 실패한다.
     */
    default void requireFiles(ToolInput input) {
        if (input.files().isEmpty()) {
            throw new ToolProcessingException(getName() + ": 처리할 파일이 없습니다.");
        }
    }
}
