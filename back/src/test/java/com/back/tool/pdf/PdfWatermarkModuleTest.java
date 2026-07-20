package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.rendering.PDFRenderer;
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

    /** textElements JSON 파라미터의 원소 하나. page가 null이면 "모든 페이지"를 뜻하는 JSON null을 만든다. */
    private String element(String text, double xPercent, double yPercent, String color, int fontSize, Integer page) {
        return element(text, xPercent, yPercent, color, fontSize, page, null, false);
    }

    private String element(String text, double xPercent, double yPercent, String color, int fontSize, Integer page,
                            String fontWeight) {
        return element(text, xPercent, yPercent, color, fontSize, page, fontWeight, false);
    }

    private String element(String text, double xPercent, double yPercent, String color, int fontSize, Integer page,
                            String fontWeight, boolean tiled) {
        return String.format(
                "{\"text\":\"%s\",\"xPercent\":%s,\"yPercent\":%s,\"color\":\"%s\",\"fontSize\":%d,\"page\":%s,\"fontWeight\":%s,\"tiled\":%s}",
                text, xPercent, yPercent, color, fontSize, page == null ? "null" : page,
                fontWeight == null ? "null" : "\"" + fontWeight + "\"", tiled);
    }

    private String elementsJson(String... elements) {
        return "[" + String.join(",", elements) + "]";
    }

    private boolean containsColor(BufferedImage image, Color target, int tolerance) {
        return countColorPixels(image, target, tolerance) > 0;
    }

    private boolean containsColorInRegion(BufferedImage image, Color target, int tolerance,
                                           double xStart, double xEnd, double yStart, double yEnd) {
        int x0 = (int) (image.getWidth() * xStart);
        int x1 = (int) (image.getWidth() * xEnd);
        int y0 = (int) (image.getHeight() * yStart);
        int y1 = (int) (image.getHeight() * yEnd);
        for (int x = x0; x < x1; x++) {
            for (int y = y0; y < y1; y++) {
                if (closeEnough(new Color(image.getRGB(x, y)), target, tolerance)) return true;
            }
        }
        return false;
    }

    private int countColorPixels(BufferedImage image, Color target, int tolerance) {
        int count = 0;
        for (int x = 0; x < image.getWidth(); x++) {
            for (int y = 0; y < image.getHeight(); y++) {
                if (closeEnough(new Color(image.getRGB(x, y)), target, tolerance)) count++;
            }
        }
        return count;
    }

    private boolean closeEnough(Color pixel, Color target, int tolerance) {
        return Math.abs(pixel.getRed() - target.getRed()) <= tolerance
                && Math.abs(pixel.getGreen() - target.getGreen()) <= tolerance
                && Math.abs(pixel.getBlue() - target.getBlue()) <= tolerance;
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
    void 텍스트_요소의_page가_null이면_모든_페이지에_렌더링된다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1", "P2");
        String elements = elementsJson(element("워터마크", 10, 10, "#000000", 24, null));

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elements, "opacity", "50")));

        assertThat(result.isFile()).isTrue();
        assertThat(textOfPage(result.outputFile(), 1)).contains("P1").contains("워터마크");
        assertThat(textOfPage(result.outputFile(), 2)).contains("P2").contains("워터마크");
    }

    @Test
    void 텍스트_요소에_page를_지정하면_그_페이지에만_렌더링된다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1", "P2");
        String elements = elementsJson(element("2페이지전용", 10, 10, "#000000", 24, 2));

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elements, "opacity", "100")));

        assertThat(textOfPage(result.outputFile(), 1)).doesNotContain("2페이지전용");
        assertThat(textOfPage(result.outputFile(), 2)).contains("2페이지전용");
    }

    @Test
    void 여러_텍스트_요소를_각자_지정한_위치와_색상으로_동시에_배치할_수_있다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");
        Color red = new Color(0xFF, 0x00, 0x00);
        Color blue = new Color(0x00, 0x00, 0xFF);
        String elements = elementsJson(
                element("RED", 5, 5, "#FF0000", 60, null),
                element("BLUE", 60, 80, "#0000FF", 60, null));

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elements, "opacity", "100")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            BufferedImage rendered = new PDFRenderer(doc).renderImage(0);
            assertThat(containsColorInRegion(rendered, red, 10, 0.0, 0.4, 0.0, 0.4))
                    .as("빨간 텍스트는 좌상단 영역에 있어야 한다").isTrue();
            assertThat(containsColorInRegion(rendered, blue, 10, 0.0, 0.4, 0.0, 0.4))
                    .as("파란 텍스트는 좌상단 영역에 없어야 한다").isFalse();
            assertThat(containsColorInRegion(rendered, blue, 10, 0.4, 1.0, 0.4, 1.0))
                    .as("파란 텍스트는 우하단 영역에 있어야 한다").isTrue();
            assertThat(containsColorInRegion(rendered, red, 10, 0.4, 1.0, 0.4, 1.0))
                    .as("빨간 텍스트는 우하단 영역에 없어야 한다").isFalse();
        }
    }

    @Test
    void 색상을_생략한_요소의_기본값은_검정이다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");
        String elements = elementsJson(element("MMMMM", 10, 10, "", 72, null));

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elements, "opacity", "100")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            BufferedImage rendered = new PDFRenderer(doc).renderImage(0);
            assertThat(containsColor(rendered, Color.BLACK, 10)).isTrue();
        }
    }

    @Test
    void 텍스트_크기를_키우면_실제_렌더링_커버리지가_넓어진다() throws Exception {
        Path smallPdf = createPdf("small.pdf", "P1");
        Path bigPdf = createPdf("big.pdf", "P1");
        Color blue = new Color(0x00, 0x00, 0xFF);

        ToolResult smallResult = module.process(new ToolInput(List.of(smallPdf),
                Map.of("textElements", elementsJson(element("MMMMM", 10, 10, "#0000FF", 10, null)), "opacity", "100")));
        ToolResult bigResult = module.process(new ToolInput(List.of(bigPdf),
                Map.of("textElements", elementsJson(element("MMMMM", 10, 10, "#0000FF", 80, null)), "opacity", "100")));

        int smallCoverage;
        int bigCoverage;
        try (PDDocument doc = PDDocument.load(smallResult.outputFile().toFile())) {
            smallCoverage = countColorPixels(new PDFRenderer(doc).renderImage(0), blue, 10);
        }
        try (PDDocument doc = PDDocument.load(bigResult.outputFile().toFile())) {
            bigCoverage = countColorPixels(new PDFRenderer(doc).renderImage(0), blue, 10);
        }
        assertThat(bigCoverage).as("fontSize가 클수록 색칠된 픽셀 수가 더 많아야 한다").isGreaterThan(smallCoverage);
    }

    @Test
    void 굵기를_BLACK으로_지정하면_REGULAR보다_렌더링_커버리지가_넓어진다() throws Exception {
        Path regularPdf = createPdf("regular.pdf", "P1");
        Path blackPdf = createPdf("black.pdf", "P1");
        Color blue = new Color(0x00, 0x00, 0xFF);

        ToolResult regularResult = module.process(new ToolInput(List.of(regularPdf),
                Map.of("textElements", elementsJson(element("MMMMM", 10, 10, "#0000FF", 60, null, "REGULAR")), "opacity", "100")));
        ToolResult blackResult = module.process(new ToolInput(List.of(blackPdf),
                Map.of("textElements", elementsJson(element("MMMMM", 10, 10, "#0000FF", 60, null, "BLACK")), "opacity", "100")));

        int regularCoverage;
        int blackCoverage;
        try (PDDocument doc = PDDocument.load(regularResult.outputFile().toFile())) {
            regularCoverage = countColorPixels(new PDFRenderer(doc).renderImage(0), blue, 10);
        }
        try (PDDocument doc = PDDocument.load(blackResult.outputFile().toFile())) {
            blackCoverage = countColorPixels(new PDFRenderer(doc).renderImage(0), blue, 10);
        }
        assertThat(blackCoverage).as("BLACK 굵기는 REGULAR보다 획이 굵어 커버리지가 더 넓어야 한다").isGreaterThan(regularCoverage);
    }

    @Test
    void 굵기를_생략한_요소의_기본값은_REGULAR다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elementsJson(element("MMMMM", 10, 10, "#0000FF", 60, null)), "opacity", "100")));

        assertThat(result.isFile()).isTrue();
    }

    @Test
    void 서로_다른_굵기의_요소_두_개를_같은_문서에_동시에_그릴_수_있다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");
        String elements = elementsJson(
                element("A", 5, 5, "#ff0000", 40, null, "REGULAR"),
                element("B", 5, 50, "#0000ff", 40, null, "BLACK"));

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elements, "opacity", "100")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            BufferedImage rendered = new PDFRenderer(doc).renderImage(0);
            assertThat(containsColor(rendered, new Color(0xFF, 0x00, 0x00), 10)).isTrue();
            assertThat(containsColor(rendered, new Color(0x00, 0x00, 0xFF), 10)).isTrue();
        }
    }

    @Test
    void 지원하지_않는_굵기값이면_명확한_에러() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elementsJson(element("X", 5, 5, "#000000", 24, null, "ITALIC"))))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("굵기");
    }

    @Test
    void 타일링을_켜면_페이지_전체에_반복해서_렌더링된다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");
        Color blue = new Color(0x00, 0x00, 0xFF);
        String elements = elementsJson(element("X", 50, 50, "#0000FF", 20, null, "REGULAR", true));

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elements, "opacity", "100")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            BufferedImage rendered = new PDFRenderer(doc).renderImage(0);
            assertThat(containsColorInRegion(rendered, blue, 10, 0.0, 0.25, 0.0, 0.25))
                    .as("좌상단 구석까지 반복 패턴이 덮어야 한다").isTrue();
            assertThat(containsColorInRegion(rendered, blue, 10, 0.4, 0.6, 0.4, 0.6))
                    .as("중앙에도 패턴이 있어야 한다").isTrue();
            assertThat(containsColorInRegion(rendered, blue, 10, 0.75, 1.0, 0.75, 1.0))
                    .as("우하단 구석까지 반복 패턴이 덮어야 한다").isTrue();
        }
    }

    @Test
    void 타일링이_꺼져있으면_지정한_위치에만_렌더링되고_구석은_비어있다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");
        Color blue = new Color(0x00, 0x00, 0xFF);
        String elements = elementsJson(element("X", 50, 50, "#0000FF", 20, null, "REGULAR", false));

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elements, "opacity", "100")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            BufferedImage rendered = new PDFRenderer(doc).renderImage(0);
            assertThat(containsColorInRegion(rendered, blue, 10, 0.4, 0.6, 0.4, 0.6))
                    .as("지정한 중앙 위치엔 있어야 한다").isTrue();
            assertThat(containsColorInRegion(rendered, blue, 10, 0.0, 0.15, 0.0, 0.15))
                    .as("타일링이 꺼져 있으면 구석은 비어 있어야 한다").isFalse();
        }
    }

    @Test
    void tiled_필드를_생략하면_기본값은_타일링_꺼짐이다() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");
        // tiled 키 자체를 빼고 수동으로 JSON을 만든다(생략 시 기본 동작 확인).
        String elements = "[{\"text\":\"X\",\"xPercent\":50,\"yPercent\":50,\"color\":\"#0000FF\",\"fontSize\":20,\"page\":null}]";
        Color blue = new Color(0x00, 0x00, 0xFF);

        ToolResult result = module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", elements, "opacity", "100")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            BufferedImage rendered = new PDFRenderer(doc).renderImage(0);
            assertThat(containsColorInRegion(rendered, blue, 10, 0.0, 0.15, 0.0, 0.15))
                    .as("tiled 생략 시 기본값은 false — 구석엔 없어야 한다").isFalse();
        }
    }

    @Test
    void 이미지_대상에서도_타일링이_페이지_전체에_적용된다() throws Exception {
        Path image = createSolidImage("base.png", 400, 400, Color.WHITE);
        Color blue = new Color(0x00, 0x00, 0xFF);
        String elements = elementsJson(element("X", 50, 50, "#0000FF", 20, null, "REGULAR", true));

        ToolResult result = module.process(new ToolInput(List.of(image),
                Map.of("textElements", elements, "opacity", "100")));

        BufferedImage output = ImageIO.read(result.outputFile().toFile());
        assertThat(containsColorInRegion(output, blue, 10, 0.0, 0.25, 0.0, 0.25))
                .as("좌상단 구석까지 반복 패턴이 덮어야 한다").isTrue();
        assertThat(containsColorInRegion(output, blue, 10, 0.75, 1.0, 0.75, 1.0))
                .as("우하단 구석까지 반복 패턴이 덮어야 한다").isTrue();
    }

    @Test
    void 워터마크_텍스트_JSON_형식이_잘못되면_명확한_에러() throws Exception {
        Path pdf = createPdf("doc.pdf", "P1");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(pdf),
                Map.of("textElements", "이건 JSON이 아님"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("형식이 올바르지 않습니다");
    }

    @Test
    void 이미지_대상_텍스트_워터마크_색상을_지정하면_지정한_색상으로_그려진다() throws Exception {
        Path image = createSolidImage("base.png", 200, 200, Color.WHITE);
        Color green = new Color(0x00, 0xFF, 0x00);

        ToolResult result = module.process(new ToolInput(List.of(image),
                Map.of("textElements", elementsJson(element("MMMMM", 10, 10, "#00FF00", 72, null)), "opacity", "100")));

        BufferedImage output = ImageIO.read(result.outputFile().toFile());
        assertThat(containsColor(output, green, 10)).as("지정한 색상(#00FF00) 픽셀이 있어야 한다").isTrue();
        assertThat(containsColor(output, Color.RED, 10))
                .as("색상을 지정했으므로 예전 하드코딩 기본값(빨강)으로 그려지면 안 된다").isFalse();
    }

    @Test
    void 이미지에_텍스트_워터마크를_삽입하면_원본과_결과의_픽셀이_실제로_달라진다() throws Exception {
        Path image = createSolidImage("base.png", 200, 200, Color.WHITE);

        ToolResult result = module.process(new ToolInput(List.of(image),
                Map.of("textElements", elementsJson(element("SAMPLE", 10, 10, "#000000", 48, null)), "opacity", "100")));

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
    void 텍스트_요소도_워터마크_이미지도_없으면_명확한_에러() throws Exception {
        Path image = createSolidImage("base.png", 100, 100, Color.WHITE);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(image), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("텍스트 워터마크 또는 워터마크 이미지");
    }

    @Test
    void PDF도_이미지도_아닌_파일이면_명확한_에러() throws Exception {
        Path textFile = tempDir.resolve("notes.txt");
        Files.writeString(textFile, "hello");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(textFile),
                Map.of("textElements", elementsJson(element("워터마크", 10, 10, "#000000", 24, null))))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("PDF 또는 이미지");
    }

    @Test
    void 파일이_3개_이상이면_명확한_에러() throws Exception {
        Path a = createSolidImage("a.png", 10, 10, Color.WHITE);
        Path b = createSolidImage("b.png", 10, 10, Color.WHITE);
        Path c = createSolidImage("c.png", 10, 10, Color.WHITE);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(a, b, c), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("1개(선택)만 지원");
    }
}
