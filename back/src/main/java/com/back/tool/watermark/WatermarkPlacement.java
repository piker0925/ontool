package com.back.tool.watermark;

/**
 * 텍스트/이미지 워터마크의 퍼센트 좌표({@code xPercent}/{@code yPercent}, 0~100)를 실제 픽셀·포인트
 * 좌표로 바꾸는 공통 계산기. PDF·래스터 이미지·영상 세 대상이 지금까지 각자 인라인으로 계산하던 것을
 * 여기로 모아, 텍스트/이미지 워터마크가 같은 좌표 규약을 쓰도록 통일한다(129).
 *
 * <p>앵커는 항상 콘텐츠(텍스트 박스 또는 이미지)의 <b>좌상단</b>이다 — 프론트
 * {@code WatermarkEditorCanvas}가 그리는 드래그 박스의 {@code left}/{@code top}과 동일한 규약이라,
 * 프론트에서 계산 없이 그대로 보낸 값을 여기서 대상 좌표계에 맞게 변환하기만 하면 된다.
 */
public final class WatermarkPlacement {

    private WatermarkPlacement() {
    }

    /** 좌상단 원점, y축이 아래로 증가하는 좌표계(래스터 이미지, 영상 등)에서의 x좌표. */
    public static double topDownX(double xPercent, double containerWidth) {
        return xPercent / 100.0 * containerWidth;
    }

    /** 좌상단 원점, y축이 아래로 증가하는 좌표계에서의 y좌표(텍스트라면 베이스라인 보정은 호출부 책임). */
    public static double topDownY(double yPercent, double containerHeight) {
        return yPercent / 100.0 * containerHeight;
    }

    /**
     * PDF 좌표계(좌하단 원점, y축이 위로 증가)에서의 y좌표. {@code contentHeight}는 텍스트면
     * fontSize, 이미지면 이미지 높이 — 퍼센트가 콘텐츠의 "윗변" 기준이므로, PDF가 원점으로 삼는
     * 콘텐츠의 "아랫변"으로 바꾸려면 컨테이너 높이에서 콘텐츠 높이만큼 한 번 더 내려야 한다.
     */
    public static double pdfY(double yPercent, double containerHeight, double contentHeight) {
        double topY = topDownY(yPercent, containerHeight);
        return containerHeight - topY - contentHeight;
    }

    /** 퍼센트 파라미터가 없을 때(레거시 호출)의 우하단 x좌표 — 항상 top-down 좌표계 기준. */
    public static double bottomRightX(double containerWidth, double contentWidth, double margin) {
        return containerWidth - contentWidth - margin;
    }

    /** 퍼센트 파라미터가 없을 때(레거시 호출)의 우하단 y좌표 — 항상 top-down 좌표계 기준. */
    public static double bottomRightY(double containerHeight, double contentHeight, double margin) {
        return containerHeight - contentHeight - margin;
    }

    /**
     * top-down 좌표계에서의 x좌표 — {@code xPercent}가 있으면 그 퍼센트로, 없으면(구버전 호출 등)
     * 레거시 우하단으로 폴백한다. PDF·래스터 이미지·영상 세 호출부가 똑같이 반복하던 삼항 분기를
     * 여기 한 곳으로 모은 것(129 코드 리뷰) — x축은 어느 좌표계든 뒤집을 필요가 없어 공통이다.
     */
    public static double resolveX(Double xPercent, double containerWidth, double contentWidth, double margin) {
        return xPercent != null
                ? topDownX(xPercent, containerWidth)
                : bottomRightX(containerWidth, contentWidth, margin);
    }

    /** top-down 좌표계(래스터 이미지, 영상)에서의 y좌표 — {@link #resolveX}의 y축 버전. */
    public static double resolveTopDownY(Double yPercent, double containerHeight, double contentHeight,
                                          double margin) {
        return yPercent != null
                ? topDownY(yPercent, containerHeight)
                : bottomRightY(containerHeight, contentHeight, margin);
    }

    /**
     * PDF 좌표계(좌하단 원점)에서의 y좌표 — {@code yPercent}가 있으면 {@link #pdfY}로, 없으면
     * 레거시 우하단으로 폴백한다. PDF는 y=0이 이미 바닥이라 레거시 폴백이 "컨테이너 - 콘텐츠 - 여백"이
     * 아니라 여백 그 자체다({@link #resolveTopDownY}와 폴백 공식이 다른 이유).
     */
    public static double resolvePdfY(Double yPercent, double containerHeight, double contentHeight, double margin) {
        return yPercent != null ? pdfY(yPercent, containerHeight, contentHeight) : margin;
    }
}
