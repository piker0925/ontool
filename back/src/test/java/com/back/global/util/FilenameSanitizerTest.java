package com.back.global.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ZIP 엔트리명에 쓰기 위한 파일명 정화 (038). 원본 파일명은 업로더가 통제하는 신뢰 불가 입력이라,
 * Zip Slip(압축 해제 시 경로 탈출)을 막도록 순수 basename으로 강제한다.
 */
class FilenameSanitizerTest {

    @Test
    void 정상_파일명은_그대로_보존한다() {
        assertThat(FilenameSanitizer.sanitize("red.png")).isEqualTo("red.png");
    }

    @Test
    void 유니코드_한글_파일명을_보존한다() {
        // 한국 사용자 파일명이 뭉개지지 않아야 한다.
        assertThat(FilenameSanitizer.sanitize("계약서.png")).isEqualTo("계약서.png");
    }

    @Test
    void 슬래시_경로를_제거하고_마지막_세그먼트만_남긴다() {
        assertThat(FilenameSanitizer.sanitize("../../evil.png")).isEqualTo("evil.png");
        assertThat(FilenameSanitizer.sanitize("foo/bar.png")).isEqualTo("bar.png");
    }

    @Test
    void 백슬래시_경로도_제거한다_윈도우_Zip_Slip_방지() {
        // getFileName()은 리눅스에서 백슬래시를 한 세그먼트로 남기지만, Windows 압축 해제기엔 구분자다.
        String out = FilenameSanitizer.sanitize("..\\..\\evil.png");
        assertThat(out).isEqualTo("evil.png");
        assertThat(out).doesNotContain("\\").doesNotContain("..");
    }

    @Test
    void 널바이트와_제어문자를_제거한다() {
        String withControls = "a" + (char) 0 + "b" + (char) 7 + ".png"; // 널바이트 + BEL
        assertThat(FilenameSanitizer.sanitize(withControls)).isEqualTo("ab.png");
    }

    @Test
    void 상위_현재_디렉토리_참조와_빈이름은_빈문자열로() {
        // 폴백 대상 — 호출부가 file-N.ext로 대체한다.
        assertThat(FilenameSanitizer.sanitize("..")).isEmpty();
        assertThat(FilenameSanitizer.sanitize(".")).isEmpty();
        assertThat(FilenameSanitizer.sanitize("/")).isEmpty();
        assertThat(FilenameSanitizer.sanitize(null)).isEmpty();
    }

    @Test
    void 화이트리스트_밖_문자는_밑줄로_치환한다() {
        // 별표·물음표·콜론 등(윈도우 예약문자 포함)은 _로.
        assertThat(FilenameSanitizer.sanitize("a*b?c:d.png")).isEqualTo("a_b_c_d.png");
    }

    @Test
    void 과도하게_긴_이름은_잘라낸다() {
        String longName = "a".repeat(500) + ".png";
        assertThat(FilenameSanitizer.sanitize(longName).length()).isLessThanOrEqualTo(200);
    }

    @Test
    void 전부_점인_이름은_빈문자열로_후행점_우회_차단() {
        // "..."는 정확히 ".."는 아니지만 downstream이 ".."로 접을 수 있어 원천 차단(폴백 대상).
        assertThat(FilenameSanitizer.sanitize("...")).isEmpty();
        assertThat(FilenameSanitizer.sanitize("....")).isEmpty();
        assertThat(FilenameSanitizer.sanitize(".. ")).isEmpty();
    }

    @Test
    void 후행_점과_공백은_제거하되_선행_점_dotfile은_보존한다() {
        assertThat(FilenameSanitizer.sanitize("report.")).isEqualTo("report");
        assertThat(FilenameSanitizer.sanitize("name ")).isEqualTo("name");
        // 선행 점(dotfile)은 정상 파일명 — 보존해야 과잉 정화가 아니다.
        assertThat(FilenameSanitizer.sanitize(".gitignore")).isEqualTo(".gitignore");
    }
}
