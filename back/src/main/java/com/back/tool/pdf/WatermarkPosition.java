package com.back.tool.pdf;

import java.awt.geom.Point2D;

/**
 * 워터마크(텍스트/이미지)를 어느 모서리·중앙에 배치할지 계산하는 공용 값 타입.
 * PDF 오버레이 분기와 이미지 합성 분기가 코너 좌표 계산 로직을 각자 구현하지 않고 공유한다.
 *
 * <p>{@link #offset}은 좌상단을 원점으로 하고 y축이 아래로 증가하는 좌표계(이미지·화면 좌표계) 기준으로
 * 콘텐츠의 좌상단 좌표를 반환한다. PDF는 좌하단 원점·y축이 위로 증가하는 좌표계를 쓰므로, PDF에 적용할 때는
 * 호출부에서 {@code pdfY = containerHeight - offset.y - contentHeight}로 뒤집어 사용한다.
 */
public enum WatermarkPosition {
    TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT, CENTER;

    public Point2D.Double offset(double containerWidth, double containerHeight,
                                  double contentWidth, double contentHeight, double margin) {
        double x = switch (this) {
            case TOP_LEFT, BOTTOM_LEFT -> margin;
            case TOP_RIGHT, BOTTOM_RIGHT -> containerWidth - contentWidth - margin;
            case CENTER -> (containerWidth - contentWidth) / 2;
        };
        double y = switch (this) {
            case TOP_LEFT, TOP_RIGHT -> margin;
            case BOTTOM_LEFT, BOTTOM_RIGHT -> containerHeight - contentHeight - margin;
            case CENTER -> (containerHeight - contentHeight) / 2;
        };
        return new Point2D.Double(x, y);
    }
}
