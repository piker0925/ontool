package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResumePdfModuleTest {

    @TempDir
    Path tempDir;

    private final ResumePdfModule module = new ResumePdfModule();

    private Path createMd(String content) throws Exception {
        Path md = tempDir.resolve("resume.md");
        Files.writeString(md, content);
        return md;
    }

    @Test
    void 이력서_마크다운의_섹션_제목과_본문이_PDF_텍스트에_실제로_포함된다() throws Exception {
        Path md = createMd("""
                # 홍길동

                ## 경력

                회사 A에서 3년간 백엔드 개발 담당

                ## 학력

                서울대학교 컴퓨터공학과 졸업
                """);

        ToolResult result = module.process(new ToolInput(List.of(md), Map.of()));

        assertThat(result.isFile()).isTrue();
        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains(
                    "홍길동", "경력", "회사 A에서 3년간 백엔드 개발 담당", "학력", "서울대학교 컴퓨터공학과 졸업");
        }
    }

    @Test
    void 입력_파일이_없으면_명확한_에러를_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("이력서 마크다운 파일이 필요합니다");
    }

    @Test
    void 지원하지_않는_용지_크기는_공용_렌더러의_검증_메시지를_그대로_사용한다() throws Exception {
        // HtmlToPdfRenderer.resolvePaperSize 재사용 여부를 회귀 방지로 검증한다.
        Path md = createMd("# x\n");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(md), Map.of("paperSize", "B4"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("용지 크기는 A4, Letter, A5");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("resume-pdf");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("pdf");
    }
}
