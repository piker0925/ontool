package com.back.tool.watermark;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WatermarkPlacementTest {

    @Test
    void topDownX_isPercentOfContainerWidth() {
        assertThat(WatermarkPlacement.topDownX(25, 200)).isEqualTo(50);
        assertThat(WatermarkPlacement.topDownX(0, 200)).isEqualTo(0);
        assertThat(WatermarkPlacement.topDownX(100, 200)).isEqualTo(200);
    }

    @Test
    void topDownY_isPercentOfContainerHeight() {
        assertThat(WatermarkPlacement.topDownY(50, 400)).isEqualTo(200);
    }

    @Test
    void pdfY_flipsTopDownPercentIntoBottomLeftOrigin() {
        // 컨테이너 높이 300, yPercent=0(맨 위) — 콘텐츠 높이 20짜리를 맨 위에 붙이면
        // PDF 좌표(좌하단 원점)로는 "컨테이너 높이 - 콘텐츠 높이"만큼 올라간 지점이어야 한다.
        assertThat(WatermarkPlacement.pdfY(0, 300, 20)).isEqualTo(280);
        // yPercent=100(맨 아래)이면 PDF y=0 부근(콘텐츠 높이만큼 내려가 음수가 될 수도 있음 — 그대로 반환).
        assertThat(WatermarkPlacement.pdfY(100, 300, 20)).isEqualTo(-20);
    }

    @Test
    void bottomRight_subtractsContentAndMarginFromContainer() {
        assertThat(WatermarkPlacement.bottomRightX(200, 50, 10)).isEqualTo(140);
        assertThat(WatermarkPlacement.bottomRightY(300, 40, 10)).isEqualTo(250);
    }

    // resolveX/resolveTopDownY/resolvePdfY — PdfWatermarkModule·VideoWatermarkModule 세 곳에서
    // 똑같이 반복되던 "퍼센트가 있으면 퍼센트로, 없으면 레거시 우하단으로" 삼항 분기(129 코드 리뷰
    // 지적)를 여기 한 곳으로 모은다.

    @Test
    void resolveX_percentPresent_usesTopDownX() {
        assertThat(WatermarkPlacement.resolveX(25.0, 200, 50, 10)).isEqualTo(50);
    }

    @Test
    void resolveX_percentNull_fallsBackToBottomRight() {
        assertThat(WatermarkPlacement.resolveX(null, 200, 50, 10)).isEqualTo(140);
    }

    @Test
    void resolveTopDownY_percentPresent_usesTopDownY() {
        assertThat(WatermarkPlacement.resolveTopDownY(50.0, 400, 40, 10)).isEqualTo(200);
    }

    @Test
    void resolveTopDownY_percentNull_fallsBackToBottomRight() {
        assertThat(WatermarkPlacement.resolveTopDownY(null, 300, 40, 10)).isEqualTo(250);
    }

    @Test
    void resolvePdfY_percentPresent_usesPdfY() {
        assertThat(WatermarkPlacement.resolvePdfY(0.0, 300, 20, 10)).isEqualTo(280);
    }

    @Test
    void resolvePdfY_percentNull_fallsBackToLegacyMargin() {
        // PDF 좌표계는 y=0이 이미 바닥이라, 레거시 우하단 폴백은 "컨테이너 - 콘텐츠 - 여백"이 아니라
        // 여백 그 자체다(PdfWatermarkModule의 기존 주석·동작과 동일).
        assertThat(WatermarkPlacement.resolvePdfY(null, 300, 20, 10)).isEqualTo(10);
    }
}
