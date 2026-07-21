package com.back.tool.model;

public interface ToolModule {
    String getId();

    String getName();

    String getCategory();

    boolean isHeavy();

    // true면 모든 파일을 단일 job으로 처리 (pdf-merge, gif-create)
    // false면 파일 1개당 별도 job (image-resize, image-format 등)
    default boolean acceptsMultipleFiles() { return false; }

    // 자원 등급 레인(동시성 판정). 기본 HEAVY, 영상 모듈만 VIDEO로 오버라이드 (ADR-0019)
    default Lane getLane() { return Lane.HEAVY; }

    /**
     * 업로드 크기 한도 판정 기준(106/ADR-0033). 기본은 getLane()과 같지만, 동시성 판정과 파일 크기
     * 위험도가 다른 모듈은 오버라이드한다 — 예: VideoMetadataModule은 ffprobe만 써서 동시성은 HEAVY
     * 레인으로 충분하지만(getLane), 힙 위험이 없는 건 다른 영상 모듈과 같아 업로드 한도는 VIDEO
     * 기준이어야 한다. getLane()만으로 판정하면 이런 모듈이 조용히 좁은 한도에 걸린다.
     */
    default Lane getUploadSizeLane() { return getLane(); }

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
