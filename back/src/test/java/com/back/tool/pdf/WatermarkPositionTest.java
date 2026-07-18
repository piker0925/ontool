package com.back.tool.pdf;

import org.junit.jupiter.api.Test;

import java.awt.geom.Point2D;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

class WatermarkPositionTest {

    private static final double CONTAINER_W = 200;
    private static final double CONTAINER_H = 100;
    private static final double CONTENT_W = 50;
    private static final double CONTENT_H = 20;
    private static final double MARGIN = 10;

    private void assertOffset(WatermarkPosition position, double expectedX, double expectedY) {
        Point2D.Double offset = position.offset(CONTAINER_W, CONTAINER_H, CONTENT_W, CONTENT_H, MARGIN);
        assertThat(offset.x).as("x of %s", position).isCloseTo(expectedX, offset(0.001));
        assertThat(offset.y).as("y of %s", position).isCloseTo(expectedY, offset(0.001));
    }

    @Test
    void 좌상단은_여백만큼_안쪽에서_시작한다() {
        assertOffset(WatermarkPosition.TOP_LEFT, 10, 10);
    }

    @Test
    void 우상단은_컨테이너_오른쪽에_맞춰지고_상단_여백을_유지한다() {
        assertOffset(WatermarkPosition.TOP_RIGHT, 200 - 50 - 10, 10);
    }

    @Test
    void 좌하단은_왼쪽_여백을_유지하고_컨테이너_하단에_맞춰진다() {
        assertOffset(WatermarkPosition.BOTTOM_LEFT, 10, 100 - 20 - 10);
    }

    @Test
    void 우하단은_컨테이너_오른쪽_아래_모서리에_여백만큼_맞춰진다() {
        assertOffset(WatermarkPosition.BOTTOM_RIGHT, 200 - 50 - 10, 100 - 20 - 10);
    }

    @Test
    void 중앙은_컨테이너_중심에_콘텐츠를_배치한다() {
        assertOffset(WatermarkPosition.CENTER, (200 - 50) / 2.0, (100 - 20) / 2.0);
    }

    @Test
    void 서로_다른_위치는_서로_다른_좌표를_반환한다() {
        // 패턴 B: 위치 값이 실제로 계산에 반영되는지 — 모든 enum이 같은 좌표로 뭉개지지 않는지 확인
        Point2D.Double topLeft = WatermarkPosition.TOP_LEFT.offset(CONTAINER_W, CONTAINER_H, CONTENT_W, CONTENT_H, MARGIN);
        Point2D.Double bottomRight = WatermarkPosition.BOTTOM_RIGHT.offset(CONTAINER_W, CONTAINER_H, CONTENT_W, CONTENT_H, MARGIN);
        Point2D.Double center = WatermarkPosition.CENTER.offset(CONTAINER_W, CONTAINER_H, CONTENT_W, CONTENT_H, MARGIN);

        assertThat(topLeft).isNotEqualTo(bottomRight);
        assertThat(topLeft).isNotEqualTo(center);
        assertThat(bottomRight).isNotEqualTo(center);
    }
}
