package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class ImageToPdfModuleTest {

    @TempDir
    Path tempDir;

    private final ImageToPdfModule module = new ImageToPdfModule();

    private Path createBlueImage(String name, int width, int height) throws Exception {
        Path imgPath = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, width, height);
        g.dispose();
        ImageIO.write(img, "png", imgPath.toFile());
        return imgPath;
    }

    private static boolean isBlue(int rgb) {
        Color c = new Color(rgb);
        return c.getBlue() > 200 && c.getRed() < 100 && c.getGreen() < 100;
    }

    private static boolean isWhite(int rgb) {
        Color c = new Color(rgb);
        return c.getRed() > 240 && c.getGreen() > 240 && c.getBlue() > 240;
    }

    @Test
    void defaultParamsProduceOriginalSizeWithNoMargin() throws Exception {
        Path img = createBlueImage("a.png", 100, 60);

        ToolResult result = module.process(new ToolInput(List.of(img), Map.of()));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            assertThat(doc.getNumberOfPages()).isEqualTo(1);
            PDRectangle box = doc.getPage(0).getMediaBox();
            // 기본값(파라미터 없음)은 용지=원본, 여백=0 → 페이지가 이미지 크기와 정확히 일치
            assertThat(box.getWidth()).isCloseTo(100f, within(0.1f));
            assertThat(box.getHeight()).isCloseTo(60f, within(0.1f));

            // 여백이 없으므로 모서리까지 이미지 색상이 채워진다
            BufferedImage rendered = new PDFRenderer(doc).renderImage(0);
            assertThat(isBlue(rendered.getRGB(2, 2))).isTrue();
        }
    }

    @Test
    void smallImageOnFixedPaperSizeIsNotUpscaledBeyondOriginal() throws Exception {
        Path img = createBlueImage("i.png", 50, 50);

        ToolResult result = module.process(new ToolInput(List.of(img),
                Map.of("paperSize", "A4", "margin", "0")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            BufferedImage rendered = new PDFRenderer(doc).renderImageWithDPI(0, 72);
            int y = rendered.getHeight() / 2;
            int blueWidth = 0;
            for (int x = 0; x < rendered.getWidth(); x++) {
                if (isBlue(rendered.getRGB(x, y))) blueWidth++;
            }
            // scale이 1로 캡되므로 그려진 이미지 폭은 원본(50pt ≈ 50px @72dpi)을 크게 못 넘는다.
            // 캡이 없다면 A4 폭(595pt)에 가깝게 확대되어 이 assertion이 실패한다.
            assertThat(blueWidth).isLessThanOrEqualTo(55);
        }
    }

    @Test
    void letterLandscapeSwapsPageDimensions() throws Exception {
        Path img = createBlueImage("b.png", 100, 100);

        ToolResult result = module.process(new ToolInput(List.of(img),
                Map.of("paperSize", "Letter", "orientation", "landscape")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            PDRectangle box = doc.getPage(0).getMediaBox();
            assertThat(box.getWidth()).isCloseTo(PDRectangle.LETTER.getHeight(), within(0.5f)); // 792
            assertThat(box.getHeight()).isCloseTo(PDRectangle.LETTER.getWidth(), within(0.5f)); // 612
        }
    }

    @Test
    void originalSizeWithZeroMarginKeepsExactImageDimensions() throws Exception {
        Path img = createBlueImage("c.png", 120, 80);

        ToolResult result = module.process(new ToolInput(List.of(img),
                Map.of("paperSize", "원본", "margin", "0")));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            PDRectangle box = doc.getPage(0).getMediaBox();
            assertThat(box.getWidth()).isCloseTo(120f, within(0.1f));
            assertThat(box.getHeight()).isCloseTo(80f, within(0.1f));

            // 여백 0이면 모서리까지 이미지가 채워진다
            BufferedImage rendered = new PDFRenderer(doc).renderImage(0);
            assertThat(isBlue(rendered.getRGB(2, 2))).isTrue();
        }
    }

    @Test
    void originalSizeWithMarginAddsBorderAroundImage() throws Exception {
        Path img = createBlueImage("d.png", 100, 100);

        ToolResult result = module.process(new ToolInput(List.of(img),
                Map.of("paperSize", "원본", "margin", "10")));

        float marginPt = 10 * 72f / 25.4f; // 28.35pt
        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            PDRectangle box = doc.getPage(0).getMediaBox();
            assertThat(box.getWidth()).isCloseTo(100 + 2 * marginPt, within(0.1f));
            assertThat(box.getHeight()).isCloseTo(100 + 2 * marginPt, within(0.1f));

            // 여백 영역은 흰색, 중앙은 파란색
            BufferedImage rendered = new PDFRenderer(doc).renderImage(0);
            assertThat(isWhite(rendered.getRGB(3, 3))).isTrue();
            assertThat(isBlue(rendered.getRGB(rendered.getWidth() / 2, rendered.getHeight() / 2))).isTrue();
        }
    }

    @Test
    void multipleImagesProduceMultiPagePdf() throws Exception {
        Path img1 = createBlueImage("e1.png", 50, 50);
        Path img2 = createBlueImage("e2.png", 50, 50);

        ToolResult result = module.process(new ToolInput(List.of(img1, img2), Map.of()));

        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            assertThat(doc.getNumberOfPages()).isEqualTo(2);
        }
    }

    @Test
    void invalidPaperSizeThrowsKoreanError() throws Exception {
        Path img = createBlueImage("f.png", 10, 10);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(img), Map.of("paperSize", "B5"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("용지 크기는 A4, Letter, 원본");
    }

    @Test
    void invalidOrientationThrowsKoreanError() throws Exception {
        Path img = createBlueImage("g.png", 10, 10);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(img), Map.of("orientation", "diagonal"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("방향은 portrait");
    }

    @Test
    void acceptsMultipleFilesAsOneJob() {
        // 컨트롤러가 여러 파일을 하나의 job으로 넘겨야 여러 이미지가 한 PDF로 합쳐진다.
        // 이 값이 false면 파일마다 별도 배치 job으로 쪼개져 1페이지짜리 PDF가 여러 개 생성된다.
        assertThat(module.acceptsMultipleFiles()).isTrue();
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("image-to-pdf");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("pdf");
    }
}
