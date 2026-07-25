package com.back.job.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 배치 ZIP "파일 자체"의 다운로드명 생성 (112). ZIP 안 엔트리명(038, ZipEntryNamer)과는 별개로,
 * ZIP 파일 자체를 첫 완료 작업의 원본 베이스명 + 나머지 건수로 이름 짓는다.
 */
class BatchZipNamerTest {

    @Test
    void 완료건이_하나뿐이면_원본_베이스명_그대로_zip_확장자만_붙인다() {
        assertThat(BatchZipNamer.nameFor("/uploads/temp/x/invoice.pdf", 1, "abc-123"))
                .isEqualTo("invoice.zip");
    }

    @Test
    void 완료건이_여럿이면_첫_원본명_외_나머지_건수를_붙인다() {
        assertThat(BatchZipNamer.nameFor("/uploads/temp/x/invoice.pdf", 3, "abc-123"))
                .isEqualTo("invoice-외2건.zip");
    }

    @Test
    void 유니코드_원본명을_보존한다() {
        assertThat(BatchZipNamer.nameFor("/uploads/temp/x/계약서.pdf", 2, "abc-123"))
                .isEqualTo("계약서-외1건.zip");
    }

    @Test
    void 완료건이_없으면_배치id_기반_이름으로_폴백한다() {
        assertThat(BatchZipNamer.nameFor("", 0, "abc-123"))
                .isEqualTo("batch-abc-123.zip");
    }

    @Test
    void 원본명을_복원할_수_없으면_배치id_기반_이름으로_폴백한다() {
        // 경로 탈출 시도(..)는 정화 후 빈 이름 — 배치id 폴백. 위험 문자를 zip 파일명에 남기지 않는다.
        assertThat(BatchZipNamer.nameFor("/uploads/temp/x/..", 2, "abc-123"))
                .isEqualTo("batch-abc-123-외1건.zip");
    }
}
