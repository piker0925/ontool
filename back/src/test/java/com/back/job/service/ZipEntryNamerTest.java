package com.back.job.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 배치 ZIP 엔트리명 생성 (038): 원본 파일 베이스명 + 결과 확장자, 충돌 시 -N, 복원 불가 시 폴백.
 * 상태(이미 쓴 이름 집합)를 들고 한 배치 안에서 순차 호출된다.
 */
class ZipEntryNamerTest {

    @Test
    void 베이스명은_원본에서_확장자는_결과에서_취한다() {
        ZipEntryNamer namer = new ZipEntryNamer();
        // image-to-pdf: 입력 red.png → 결과는 pdf → red.pdf
        assertThat(namer.nameFor("/uploads/temp/x/red.png", "job1/result.pdf")).isEqualTo("red.pdf");
    }

    @Test
    void 유니코드_원본명을_보존한다() {
        ZipEntryNamer namer = new ZipEntryNamer();
        assertThat(namer.nameFor("/uploads/temp/x/계약서.png", "job1/result.png")).isEqualTo("계약서.png");
    }

    @Test
    void 같은_이름_충돌_시_순번_접미사로_구분한다() {
        ZipEntryNamer namer = new ZipEntryNamer();
        // 같은 원본명 red.png 두 개 → 덮어쓰지 않고 red.png, red-2.png
        assertThat(namer.nameFor("/uploads/temp/a/red.png", "a/result.png")).isEqualTo("red.png");
        assertThat(namer.nameFor("/uploads/temp/b/red.png", "b/result.png")).isEqualTo("red-2.png");
    }

    @Test
    void 원본명을_복원할_수_없으면_file_순번으로_폴백한다() {
        ZipEntryNamer namer = new ZipEntryNamer();
        // 경로 탈출 시도(..)는 정화 후 빈 이름 → 위험 없이 폴백, 결과 확장자는 유지
        assertThat(namer.nameFor("/uploads/temp/x/..", "x/result.png")).isEqualTo("file-1.png");
    }

    @Test
    void 전부_점_원본명은_확장자없는_결과키여도_점두개로_새지_않는다() {
        ZipEntryNamer namer = new ZipEntryNamer();
        // 익스플로잇 경로: 원본 "..." + 확장자 없는 resultKey → 옛 로직이면 ".."가 될 수 있었다.
        String name = namer.nameFor("/uploads/temp/x/...", "x/resultnoext");
        assertThat(name).isNotEqualTo("..").isNotEqualTo(".");
        assertThat(name).doesNotContain("/").doesNotContain("\\");
    }
}
