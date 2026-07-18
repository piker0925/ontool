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

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfHeaderFooterModuleTest {

    @TempDir
    Path tempDir;

    private final PdfHeaderFooterModule module = new PdfHeaderFooterModule();

    private Path createPdf(String name, String... pageLabels) throws Exception {
        Path path = tempDir.resolve(name);
        try (PDDocument doc = new PDDocument()) {
            for (String label : pageLabels) {
                PDPage page = new PDPage();
                doc.addPage(page);
                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    cs.beginText();
                    cs.setFont(PDType1Font.HELVETICA, 24);
                    cs.newLineAtOffset(50, 400);
                    cs.showText(label);
                    cs.endText();
                }
            }
            doc.save(path.toFile());
        }
        return path;
    }

    private String textOfPage(Path pdf, int pageNumber) throws Exception {
        try (PDDocument doc = PDDocument.load(pdf.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(pageNumber);
            stripper.setEndPage(pageNumber);
            return stripper.getText(doc);
        }
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("pdf-header-footer");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("pdf");
    }

    @Test
    void 헤더_푸터_페이지번호가_각_페이지에_실제로_삽입되고_페이지번호는_페이지마다_다르다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1", "P2", "P3");

        ToolResult result = module.process(new ToolInput(List.of(pdf), Map.of(
                "headerText", "회사 기밀문서",
                "footerText", "저작권 안내",
                "pageNumberFormat", "{page}/{total}")));

        assertThat(result.isFile()).isTrue();
        Path output = result.outputFile();

        String page1 = textOfPage(output, 1);
        assertThat(page1).contains("P1").contains("회사 기밀문서").contains("저작권 안내").contains("1/3");
        assertThat(page1).doesNotContain("2/3").doesNotContain("3/3");

        String page2 = textOfPage(output, 2);
        assertThat(page2).contains("P2").contains("회사 기밀문서").contains("저작권 안내").contains("2/3");
        assertThat(page2).doesNotContain("1/3").doesNotContain("3/3");

        String page3 = textOfPage(output, 3);
        assertThat(page3).contains("P3").contains("3/3");
        assertThat(page3).doesNotContain("1/3").doesNotContain("2/3");
    }

    @Test
    void 헤더만_지정해도_페이지번호_없이_정상_동작한다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");

        ToolResult result = module.process(new ToolInput(List.of(pdf), Map.of("headerText", "머리말")));

        String page1 = textOfPage(result.outputFile(), 1);
        assertThat(page1).contains("머리말").contains("P1");
    }

    @Test
    void 헤더_푸터_페이지번호형식이_모두_비어있으면_명확한_에러() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("헤더, 푸터, 페이지번호");
    }

    @Test
    void PDF가_아닌_파일이면_명확한_에러() throws Exception {
        Path textFile = tempDir.resolve("notes.txt");
        Files.writeString(textFile, "hello");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(textFile), Map.of("headerText", "머리말"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("PDF 파일만 지원합니다");
    }
}
