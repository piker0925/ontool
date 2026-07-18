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

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfMergeModuleTest {

    @TempDir
    Path tempDir;

    private Path createPdf(String name, String... pageLabels) throws Exception {
        Path path = tempDir.resolve(name);
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

    @Test
    void mergeTwoPdfsProducesCombinedPageCount() throws Exception {
        Path pdf1 = createPdf("a.pdf", "A1", "A2");
        Path pdf2 = createPdf("b.pdf", "B1", "B2", "B3");

        PdfMergeModule module = new PdfMergeModule();
        ToolResult result = module.process(new ToolInput(List.of(pdf1, pdf2), Map.of()));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile()).exists();
        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            assertThat(doc.getNumberOfPages()).isEqualTo(5);

            String[] expectedLabels = {"A1", "A2", "B1", "B2", "B3"};
            PDFTextStripper stripper = new PDFTextStripper();
            for (int i = 0; i < expectedLabels.length; i++) {
                stripper.setStartPage(i + 1);
                stripper.setEndPage(i + 1);
                assertThat(stripper.getText(doc)).contains(expectedLabels[i]);
            }
        }
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        PdfMergeModule module = new PdfMergeModule();
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        PdfMergeModule module = new PdfMergeModule();
        assertThat(module.getId()).isEqualTo("pdf-merge");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("pdf");
    }
}
