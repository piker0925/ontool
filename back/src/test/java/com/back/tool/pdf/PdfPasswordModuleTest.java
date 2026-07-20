package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfPasswordModuleTest {

    @TempDir
    Path tempDir;

    private final PdfPasswordModule module = new PdfPasswordModule();

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
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("pdf-password");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("pdf");
    }

    @Test
    void 비밀번호_설정후_설정한_비밀번호로만_열리고_틀린_비밀번호와_무암호는_실패한다() throws Exception {
        Path pdf = createPdf("plain.pdf", "P1", "P2");

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("mode", "SET", "password", "secret123")));

        assertThat(result.isFile()).isTrue();
        Path protectedPdf = result.outputFile();

        // 올바른 비밀번호 — 열리고 내용도 온전하다
        try (PDDocument doc = PDDocument.load(protectedPdf.toFile(), "secret123")) {
            assertThat(doc.getNumberOfPages()).isEqualTo(2);
        }

        // 틀린 비밀번호 — 열리지 않는다
        assertThatThrownBy(() -> PDDocument.load(protectedPdf.toFile(), "wrong-password"))
                .isInstanceOf(InvalidPasswordException.class);

        // 비밀번호 없이 — 열리지 않는다 (설정이 실제로 걸렸는지 확인 — no-op 방지)
        assertThatThrownBy(() -> PDDocument.load(protectedPdf.toFile()))
                .isInstanceOf(InvalidPasswordException.class);
    }

    @Test
    void 올바른_비밀번호로_제거하면_결과_PDF가_비밀번호_없이_열린다() throws Exception {
        Path pdf = createPdf("plain.pdf", "P1", "P2", "P3");
        ToolResult protectedResult = module.process(new ToolInput(List.of(pdf),
                Map.of("mode", "SET", "password", "secret123")));

        ToolResult removedResult = module.process(new ToolInput(List.of(protectedResult.outputFile()),
                Map.of("mode", "REMOVE", "password", "secret123")));

        assertThat(removedResult.isFile()).isTrue();
        try (PDDocument doc = PDDocument.load(removedResult.outputFile().toFile())) {
            assertThat(doc.isEncrypted()).isFalse();
            assertThat(doc.getNumberOfPages()).isEqualTo(3);
        }
    }

    @Test
    void 틀린_비밀번호로_제거를_시도하면_명확한_에러() throws Exception {
        Path pdf = createPdf("plain.pdf", "P1");
        ToolResult protectedResult = module.process(new ToolInput(List.of(pdf),
                Map.of("mode", "SET", "password", "secret123")));

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(protectedResult.outputFile()),
                Map.of("mode", "REMOVE", "password", "wrong-password"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("비밀번호가 올바르지 않아");
    }

    @Test
    void 이미_비밀번호가_걸린_PDF에_다시_설정을_시도하면_명확한_에러() throws Exception {
        Path pdf = createPdf("plain.pdf", "P1");
        ToolResult protectedResult = module.process(new ToolInput(List.of(pdf),
                Map.of("mode", "SET", "password", "secret123")));

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(protectedResult.outputFile()),
                Map.of("mode", "SET", "password", "another-password"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("이미 비밀번호가 설정된 PDF입니다");
    }

    @Test
    void PDF가_아닌_파일이면_명확한_에러() throws Exception {
        Path textFile = tempDir.resolve("notes.txt");
        Files.writeString(textFile, "hello");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(textFile),
                Map.of("mode", "SET", "password", "secret123"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("PDF 파일만 지원합니다");
    }

    @Test
    void 비밀번호_파라미터가_없으면_명확한_에러() throws Exception {
        Path pdf = createPdf("plain.pdf", "P1");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf), Map.of("mode", "SET"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("필수");
    }
}
