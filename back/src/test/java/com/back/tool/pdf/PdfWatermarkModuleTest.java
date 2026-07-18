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

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfWatermarkModuleTest {

    @TempDir
    Path tempDir;

    private final PdfWatermarkModule module = new PdfWatermarkModule();

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

    private String textOfPage(Path pdf, int pageNumber) throws Exception {
        try (PDDocument doc = PDDocument.load(pdf.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(pageNumber);
            stripper.setEndPage(pageNumber);
            return stripper.getText(doc);
        }
    }

    private Path createSolidImage(String name, int width, int height, Color color) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, width, height);
        g.dispose();
        Path path = tempDir.resolve(name);
        ImageIO.write(image, "png", path.toFile());
        return path;
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("pdf-watermark");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("pdf");
        // 워터마크 이미지가 files[1]로 함께 오므로 단일 job으로 묶여야 한다 (082 참고: acceptsMultipleFiles 누락 시
        // ToolController가 2파일을 배치로 쪼개 워터마크 흐름이 깨진다).
        assertThat(module.acceptsMultipleFiles()).isTrue();
    }

    @Test
    void 텍스트_워터마크가_PDF의_각_페이지에_실제로_렌더링된다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1", "P2");

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("text", "워터마크", "position", "CENTER", "opacity", "50")));

        assertThat(result.isFile()).isTrue();
        assertThat(textOfPage(result.outputFile(), 1)).contains("P1").contains("워터마크");
        assertThat(textOfPage(result.outputFile(), 2)).contains("P2").contains("워터마크");
    }

    @Test
    void 이미지에_텍스트_워터마크를_삽입하면_원본과_결과의_픽셀이_실제로_달라진다() throws Exception {
        Path image = createSolidImage("base.png", 200, 200, Color.WHITE);

        ToolResult result = module.process(new ToolInput(List.of(image),
                Map.of("text", "SAMPLE", "position", "CENTER", "opacity", "100")));

        assertThat(result.isFile()).isTrue();
        BufferedImage original = ImageIO.read(image.toFile());
        BufferedImage output = ImageIO.read(result.outputFile().toFile());
        assertThat(output.getWidth()).isEqualTo(original.getWidth());
        assertThat(output.getHeight()).isEqualTo(original.getHeight());

        boolean anyPixelDiffers = false;
        for (int x = 0; x < original.getWidth() && !anyPixelDiffers; x++) {
            for (int y = 0; y < original.getHeight(); y++) {
                if (original.getRGB(x, y) != output.getRGB(x, y)) {
                    anyPixelDiffers = true;
                    break;
                }
            }
        }
        assertThat(anyPixelDiffers).as("워터마크 삽입 후 픽셀이 최소 1개는 달라져야 한다").isTrue();
    }

    @Test
    void 이미지에_이미지_워터마크를_삽입하면_지정한_위치의_픽셀만_달라지고_반대쪽_모서리는_그대로다() throws Exception {
        // 패턴 B: position 파라미터가 실제로 반영되는지 — 반대쪽 모서리가 오염되지 않아야 한다.
        Path base = createSolidImage("base.png", 400, 400, Color.WHITE);
        Path stamp = createSolidImage("stamp.png", 40, 40, Color.BLACK);

        ToolResult result = module.process(new ToolInput(List.of(base, stamp),
                Map.of("position", "TOP_LEFT", "opacity", "100")));

        BufferedImage output = ImageIO.read(result.outputFile().toFile());
        // 좌상단(여백 20 안쪽 좌표)은 검게 물들어야 하고, 우하단은 흰색 그대로여야 한다.
        assertThat(output.getRGB(25, 25)).isEqualTo(Color.BLACK.getRGB());
        assertThat(output.getRGB(390, 390)).isEqualTo(Color.WHITE.getRGB());
    }

    @Test
    void 텍스트와_워터마크_이미지가_모두_없으면_명확한_에러() throws Exception {
        Path image = createSolidImage("base.png", 100, 100, Color.WHITE);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(image), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("텍스트 워터마크 또는 워터마크 이미지");
    }

    @Test
    void PDF도_이미지도_아닌_파일이면_명확한_에러() throws Exception {
        Path textFile = tempDir.resolve("notes.txt");
        Files.writeString(textFile, "hello");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(textFile), Map.of("text", "워터마크"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("PDF 또는 이미지");
    }

    @Test
    void 파일이_3개_이상이면_명확한_에러() throws Exception {
        Path a = createSolidImage("a.png", 10, 10, Color.WHITE);
        Path b = createSolidImage("b.png", 10, 10, Color.WHITE);
        Path c = createSolidImage("c.png", 10, 10, Color.WHITE);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(a, b, c), Map.of("text", "워터마크"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("1개(선택)만 지원");
    }
}
