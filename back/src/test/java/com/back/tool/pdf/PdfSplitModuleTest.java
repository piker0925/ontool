package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.InputStream;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfSplitModuleTest {

    @TempDir
    Path tempDir;

    private final PdfSplitModule module = new PdfSplitModule();

    private Path createPdf(String... pageLabels) throws Exception {
        return createNamedPdf("input.pdf", pageLabels);
    }

    private Path createNamedPdf(String fileName, String... pageLabels) throws Exception {
        Path path = tempDir.resolve(fileName);
        try (PDDocument doc = new PDDocument()) {
            for (String label : pageLabels) {
                PDPage page = new PDPage();
                doc.addPage(page);
                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA, 24);
                    cs.newLineAtOffset(50, 700);
                    cs.showText(label);
                    cs.endText();
                }
            }
            doc.save(path.toFile());
        }
        return path;
    }

    private static List<String> entryNames(ZipFile zip) {
        List<String> names = new ArrayList<>();
        Collections.list(zip.entries()).forEach(e -> names.add(e.getName()));
        return names;
    }

    /** ZIP 엔트리를 PDF로 열어 (페이지 수, 전체 텍스트)를 검증한다. */
    private static void assertEntryPdf(ZipFile zip, String entryName, int expectedPages,
                                       String... expectedTexts) throws Exception {
        var entry = zip.getEntry(entryName);
        assertThat(entry).as("entry %s should exist", entryName).isNotNull();
        try (InputStream in = zip.getInputStream(entry);
             PDDocument doc = PDDocument.load(in)) {
            assertThat(doc.getNumberOfPages()).as("pages of %s", entryName).isEqualTo(expectedPages);
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains(expectedTexts);
        }
    }

    @Test
    void splitWithoutRangeProducesOneFilePerPage() throws Exception {
        Path pdf = createPdf("P1", "P2", "P3");

        ToolResult result = module.process(new ToolInput(List.of(pdf), Map.of()));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile()).exists();
        assertThat(result.outputFile().toString()).endsWith(".zip");
        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            assertThat(zip.size()).isEqualTo(3);
            assertEntryPdf(zip, "input-001.pdf", 1, "P1");
            assertEntryPdf(zip, "input-002.pdf", 1, "P2");
            assertEntryPdf(zip, "input-003.pdf", 1, "P3");
        }
    }

    @Test
    void pageRangeSelectsOnlyRequestedPages() throws Exception {
        // 패턴 A+B: 5페이지 중 '1-2,4'만 선택 — 포함된 페이지의 내용과
        // 제외된 페이지(3, 5)가 결과에 없는 것까지 확인한다.
        Path pdf = createPdf("P1", "P2", "P3", "P4", "P5");

        ToolResult result = module.process(new ToolInput(List.of(pdf), Map.of("pageRange", "1-2,4")));

        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            assertThat(entryNames(zip)).containsExactlyInAnyOrder(
                    "input-001.pdf", "input-002.pdf", "input-004.pdf");
            assertEntryPdf(zip, "input-001.pdf", 1, "P1");
            assertEntryPdf(zip, "input-002.pdf", 1, "P2");
            assertEntryPdf(zip, "input-004.pdf", 1, "P4");
            // 제외 페이지의 내용이 어떤 엔트리에도 섞여 들어가지 않아야 한다
            for (String name : entryNames(zip)) {
                try (InputStream in = zip.getInputStream(zip.getEntry(name));
                     PDDocument doc = PDDocument.load(in)) {
                    String text = new PDFTextStripper().getText(doc);
                    assertThat(text).doesNotContain("P3").doesNotContain("P5");
                }
            }
        }
    }

    @Test
    void groupModeRangeProducesOneFilePerRange() throws Exception {
        // 패턴 B: 동일한 범위 입력에서 groupMode=구간 은 낱장 모드와 다른 결과를 내야 한다.
        Path pdf = createPdf("P1", "P2", "P3", "P4", "P5");

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("pageRange", "1-2,4", "groupMode", "구간")));

        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            assertThat(entryNames(zip)).containsExactlyInAnyOrder(
                    "input-001-002.pdf", "input-004.pdf");
            assertEntryPdf(zip, "input-001-002.pdf", 2, "P1", "P2");
            assertEntryPdf(zip, "input-004.pdf", 1, "P4");
        }
    }

    @Test
    void openEndedRangeExtendsToLastPage() throws Exception {
        Path pdf = createPdf("P1", "P2", "P3", "P4", "P5");

        ToolResult result = module.process(new ToolInput(List.of(pdf), Map.of("pageRange", "4-")));

        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            assertThat(entryNames(zip)).containsExactlyInAnyOrder("input-004.pdf", "input-005.pdf");
            assertEntryPdf(zip, "input-004.pdf", 1, "P4");
            assertEntryPdf(zip, "input-005.pdf", 1, "P5");
        }
    }

    @Test
    void endBeyondTotalPagesIsClampedToLastPage() throws Exception {
        Path pdf = createPdf("P1", "P2", "P3");

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("pageRange", "2-100", "groupMode", "구간")));

        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            assertThat(entryNames(zip)).containsExactly("input-002-003.pdf");
            assertEntryPdf(zip, "input-002-003.pdf", 2, "P2", "P3");
        }
    }

    @Test
    void duplicatePagesAcrossRangesAreWrittenOnce() throws Exception {
        Path pdf = createPdf("P1", "P2", "P3");

        ToolResult result = module.process(new ToolInput(List.of(pdf), Map.of("pageRange", "1-2,2-3")));

        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            assertThat(entryNames(zip)).containsExactlyInAnyOrder(
                    "input-001.pdf", "input-002.pdf", "input-003.pdf");
        }
    }

    @Test
    void invalidRangeSyntaxThrowsKoreanError() throws Exception {
        Path pdf = createPdf("P1", "P2");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf), Map.of("pageRange", "abc"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("페이지 범위 형식이 잘못되었습니다");
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf), Map.of("pageRange", "1,,2"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("빈 항목");
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf), Map.of("pageRange", "1-2-3"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("페이지 범위 형식이 잘못되었습니다");
    }

    @Test
    void reversedRangeThrowsKoreanError() throws Exception {
        Path pdf = createPdf("P1", "P2", "P3");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf), Map.of("pageRange", "3-2"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("시작 페이지가 끝 페이지보다 큽니다");
    }

    @Test
    void pageNumberBelowOneThrowsKoreanError() throws Exception {
        Path pdf = createPdf("P1", "P2");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf), Map.of("pageRange", "0-2"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("1 이상");
    }

    @Test
    void startBeyondTotalPagesThrowsKoreanError() throws Exception {
        Path pdf = createPdf("P1", "P2");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf), Map.of("pageRange", "9"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("총 페이지 수(2)를 초과");
    }

    @Test
    void invalidGroupModeThrowsKoreanError() throws Exception {
        Path pdf = createPdf("P1");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf), Map.of("groupMode", "chunk"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("분할 방식은 낱장");
    }

    @Test
    void entryNamesUseOriginalUploadFileNameAsPrefix() throws Exception {
        Path pdf = createNamedPdf("report.pdf", "P1", "P2");

        ToolResult result = module.process(new ToolInput(List.of(pdf), Map.of()));

        try (ZipFile zip = new ZipFile(result.outputFile().toFile())) {
            assertThat(entryNames(zip)).containsExactlyInAnyOrder("report-001.pdf", "report-002.pdf");
        }
    }

    @Test
    void baseNameOfStripsExtensionAndSanitizesUnsafeCharacters() {
        assertThat(PdfSplitModule.baseNameOf(Path.of("My Report.PDF"))).isEqualTo("My Report");
        assertThat(PdfSplitModule.baseNameOf(Path.of("weird:name*.pdf"))).isEqualTo("weird_name_");
        // 정화 후 이름이 비면(예: 상위 디렉터리 참조) "split"로 폴백한다
        assertThat(PdfSplitModule.baseNameOf(Path.of(".."))).isEqualTo("split");
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("pdf-split");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("pdf");
    }
}
