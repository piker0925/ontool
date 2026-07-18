package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class MarkdownToPdfModuleTest {

    @TempDir
    Path tempDir;

    private final MarkdownToPdfModule module = new MarkdownToPdfModule();

    private Path createMd(String content) throws Exception {
        Path md = tempDir.resolve("test.md");
        Files.writeString(md, content);
        return md;
    }

    /** 문서 첫 텍스트 글리프의 x 좌표(pt)를 추출한다 — 좌측 여백 검증용 */
    private static float firstTextX(PDDocument doc) throws IOException {
        float[] firstX = {-1f};
        PDFTextStripper stripper = new PDFTextStripper() {
            @Override
            protected void processTextPosition(TextPosition text) {
                if (firstX[0] < 0) firstX[0] = text.getXDirAdj();
                super.processTextPosition(text);
            }
        };
        stripper.getText(doc);
        return firstX[0];
    }

    @Test
    void markdownFileConvertsToPdf() throws Exception {
        Path md = createMd("# Hello\n\nThis is **markdown**.\n\n- item 1\n- item 2\n");

        ToolResult result = module.process(new ToolInput(List.of(md), Map.of()));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile()).exists();
        assertThat(result.outputFile().toString()).endsWith(".pdf");
        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("Hello", "This is", "markdown", "item 1", "item 2");
        }
    }

    @Test
    void defaultPaperSizeIsA4AndA5IsSmaller() throws Exception {
        // 패턴 B: 기본(A4)과 A5 두 시나리오로 용지 크기 파라미터가 실제 반영되는지 구분한다.
        Path md = createMd("# Size Test\n");

        ToolResult a4 = module.process(new ToolInput(List.of(md), Map.of()));
        ToolResult a5 = module.process(new ToolInput(List.of(md), Map.of("paperSize", "A5")));

        try (PDDocument a4Doc = PDDocument.load(a4.outputFile().toFile());
             PDDocument a5Doc = PDDocument.load(a5.outputFile().toFile())) {
            PDRectangle a4Box = a4Doc.getPage(0).getMediaBox();
            assertThat(a4Box.getWidth()).isCloseTo(PDRectangle.A4.getWidth(), within(2f));   // ≈595pt
            assertThat(a4Box.getHeight()).isCloseTo(PDRectangle.A4.getHeight(), within(2f)); // ≈842pt

            PDRectangle a5Box = a5Doc.getPage(0).getMediaBox();
            assertThat(a5Box.getWidth()).isCloseTo(PDRectangle.A5.getWidth(), within(2f));   // ≈420pt
            assertThat(a5Box.getHeight()).isCloseTo(PDRectangle.A5.getHeight(), within(2f)); // ≈595pt
        }
    }

    @Test
    void letterPaperSizeIsApplied() throws Exception {
        Path md = createMd("# Letter Test\n");

        ToolResult result = module.process(new ToolInput(List.of(md), Map.of("paperSize", "Letter")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            PDRectangle box = doc.getPage(0).getMediaBox();
            assertThat(box.getWidth()).isCloseTo(PDRectangle.LETTER.getWidth(), within(2f));   // 612pt
            assertThat(box.getHeight()).isCloseTo(PDRectangle.LETTER.getHeight(), within(2f)); // 792pt
        }
    }

    @Test
    void marginShiftsTextStartPosition() throws Exception {
        // 패턴 A+B: 여백 0mm과 40mm 두 시나리오 — 텍스트 시작 x좌표를 독립 기준값(mm→pt 환산)과 비교
        Path md = createMd("LEFT-EDGE-TEXT\n");

        ToolResult margin0 = module.process(new ToolInput(List.of(md), Map.of("margin", "0")));
        ToolResult margin40 = module.process(new ToolInput(List.of(md), Map.of("margin", "40")));

        float mmToPt = 72f / 25.4f;
        try (PDDocument doc0 = PDDocument.load(margin0.outputFile().toFile());
             PDDocument doc40 = PDDocument.load(margin40.outputFile().toFile())) {
            assertThat(firstTextX(doc0)).isCloseTo(0f, within(3f));
            assertThat(firstTextX(doc40)).isCloseTo(40 * mmToPt, within(3f)); // ≈113.4pt
        }
    }

    @Test
    void blockquoteIsIndentedRelativeToPlainParagraph() throws Exception {
        // 인용문(>)이 스타일 없이 일반 문단과 똑같이 보이던 회귀를 막는다: 테두리·패딩으로 더 들여써져야 한다.
        // createMd()는 파일명이 고정("test.md")이라 같은 테스트에서 두 번 쓰면 먼저 쓴 파일이 덮어써지므로
        // 파일명을 분리해서 직접 작성한다.
        Path plainMd = tempDir.resolve("plain.md");
        Files.writeString(plainMd, "plain text\n");
        Path quoteMd = tempDir.resolve("quote.md");
        Files.writeString(quoteMd, "> plain text\n");

        ToolResult plain = module.process(new ToolInput(List.of(plainMd), Map.of("margin", "0")));
        ToolResult quote = module.process(new ToolInput(List.of(quoteMd), Map.of("margin", "0")));

        try (PDDocument plainDoc = PDDocument.load(plain.outputFile().toFile());
             PDDocument quoteDoc = PDDocument.load(quote.outputFile().toFile())) {
            float plainX = firstTextX(plainDoc);
            float quoteX = firstTextX(quoteDoc);
            assertThat(quoteX).isGreaterThan(plainX + 5f);
        }
    }

    @Test
    void gfmStrikethroughExtensionRendersWithoutTildeMarkers() throws Exception {
        // 확장이 꺼져 있으면 ~~ 가 그대로 텍스트에 남는다(핵심 CommonMark 파서는 GFM 취소선을 모름).
        Path md = createMd("~~struck~~ normal\n");

        ToolResult result = module.process(new ToolInput(List.of(md), Map.of()));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("struck", "normal");
            assertThat(text).doesNotContain("~~");
        }
    }

    @Test
    void tocInsertsLinkedTableOfContentsOnFirstPage() throws Exception {
        // 패턴 B: toc=true 는 목차 페이지가 추가되고, toc=false 는 그대로여야 한다.
        Path md = createMd("# Alpha\n\nbody-a\n\n## Beta\n\nbody-b\n");

        ToolResult without = module.process(new ToolInput(List.of(md), Map.of("toc", "false")));
        ToolResult with = module.process(new ToolInput(List.of(md), Map.of("toc", "true")));

        try (PDDocument doc = PDDocument.load(without.outputFile().toFile())) {
            assertThat(doc.getNumberOfPages()).isEqualTo(1);
        }
        try (PDDocument doc = PDDocument.load(with.outputFile().toFile())) {
            // 목차 뒤 page-break 로 본문이 다음 페이지로 밀린다
            assertThat(doc.getNumberOfPages()).isEqualTo(2);

            PDFTextStripper page1 = new PDFTextStripper();
            page1.setStartPage(1);
            page1.setEndPage(1);
            String tocText = page1.getText(doc);
            assertThat(tocText).contains("Alpha", "Beta");
            assertThat(tocText).doesNotContain("body-a"); // 목차 페이지에 본문이 없어야 한다

            PDFTextStripper page2 = new PDFTextStripper();
            page2.setStartPage(2);
            page2.setEndPage(2);
            assertThat(page2.getText(doc)).contains("Alpha", "body-a", "Beta", "body-b");
        }
    }

    @Test
    void injectTocAssignsIdsAndIndentsByHeadingLevel() {
        String body = "<h1>One</h1><p>x</p><h2>Two <em>em</em></h2>";

        String result = MarkdownToPdfModule.injectToc(body);

        assertThat(result).startsWith("<ul class=\"toc\">");
        assertThat(result).contains("<li style=\"margin-left:0px\"><a href=\"#toc-1\">One</a></li>");
        // 인라인 태그는 제거되고 레벨 2는 들여쓰기된다
        assertThat(result).contains("<li style=\"margin-left:14px\"><a href=\"#toc-2\">Two em</a></li>");
        assertThat(result).contains("<h1 id=\"toc-1\">One</h1>");
        assertThat(result).contains("<h2 id=\"toc-2\">Two <em>em</em></h2>");
    }

    @Test
    void injectTocWithoutHeadingsReturnsBodyUnchanged() {
        String body = "<p>no headings here</p>";
        assertThat(MarkdownToPdfModule.injectToc(body)).isEqualTo(body);
    }

    @Test
    void invalidPaperSizeThrowsKoreanError() throws Exception {
        Path md = createMd("# x\n");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(md), Map.of("paperSize", "B4"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("용지 크기는 A4, Letter, A5");
    }

    @Test
    void marginOutOfRangeThrowsKoreanError() throws Exception {
        Path md = createMd("# x\n");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(md), Map.of("margin", "60"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("0~50");
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("markdown-to-pdf");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("pdf");
    }
}
