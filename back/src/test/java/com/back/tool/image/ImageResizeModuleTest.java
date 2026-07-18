package com.back.tool.image;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageResizeModuleTest {

    @TempDir
    Path tempDir;

    private final ImageResizeModule module = new ImageResizeModule();

    private Path createPng(String name, int w, int h) throws Exception {
        Path p = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ImageIO.write(img, "png", p.toFile());
        return p;
    }

    /** 픽셀마다 랜덤 색 — JPEG 품질 차이가 파일 크기에 드러나도록 하는 노이즈 이미지. */
    private Path createNoisyJpg(String name, int w, int h) throws Exception {
        Path p = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Random random = new Random(42);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                img.setRGB(x, y, random.nextInt(0xFFFFFF));
            }
        }
        ImageIO.write(img, "jpg", p.toFile());
        return p;
    }

    private BufferedImage run(Path src, Map<String, String> params) throws Exception {
        ToolResult result = module.process(new ToolInput(List.of(src), params));
        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile()).exists();
        return ImageIO.read(result.outputFile().toFile());
    }

    @Test
    void resizesToRequestedDimensions() throws Exception {
        Path src = createPng("input.png", 200, 150);

        BufferedImage out = run(src, Map.of("width", "100", "height", "75"));

        assertThat(out.getWidth()).isEqualTo(100);
        assertThat(out.getHeight()).isEqualTo(75);
    }

    @Test
    void keepAspectRatioOnComputesHeightFromRatio() throws Exception {
        // 1000x800 (5:4) → 500x500 박스에 종횡비 유지로 맞추면 500x400
        Path src = createPng("ratio-on.png", 1000, 800);

        BufferedImage out = run(src, Map.of("width", "500", "height", "500", "keepAspectRatio", "true"));

        assertThat(out.getWidth()).isEqualTo(500);
        assertThat(out.getHeight()).isEqualTo(400);
    }

    @Test
    void keepAspectRatioOffForcesExactDimensions() throws Exception {
        // 같은 입력이라도 종횡비 잠금 해제 시 500x500으로 강제 변형된다
        Path src = createPng("ratio-off.png", 1000, 800);

        BufferedImage out = run(src, Map.of("width", "500", "height", "500", "keepAspectRatio", "false"));

        assertThat(out.getWidth()).isEqualTo(500);
        assertThat(out.getHeight()).isEqualTo(500);
    }

    @Test
    void percentUnitScalesFromOriginalDimensions() throws Exception {
        Path src = createPng("percent.png", 1000, 800);

        BufferedImage out = run(src, Map.of("unit", "%", "width", "50", "height", "50"));

        assertThat(out.getWidth()).isEqualTo(500);
        assertThat(out.getHeight()).isEqualTo(400);
    }

    @Test
    void preventUpscaleDefaultClampsToOriginalSizeInsteadOfEnlarging() throws Exception {
        // preventUpscale 기본값(true)이라 200% 요청해도 원본보다 커지지 않고, 경고도 필요 없다.
        Path src = createPng("upscale.png", 200, 150);

        ToolResult result = module.process(new ToolInput(
                List.of(src), Map.of("unit", "%", "width", "200", "height", "200")));

        assertThat(result.isFile()).isTrue();
        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(200);
        assertThat(out.getHeight()).isEqualTo(150);
        assertThat(result.textResult()).isNull();
    }

    @Test
    void preventUpscaleFalseAllowsEnlargementWithWarningAdvisory() throws Exception {
        // preventUpscale=false로 명시하면 예전처럼 확대를 허용하고 경고 advisory를 붙인다.
        Path src = createPng("upscale-opt-out.png", 200, 150);

        ToolResult result = module.process(new ToolInput(List.of(src),
                Map.of("unit", "%", "width", "200", "height", "200", "preventUpscale", "false")));

        assertThat(result.isFile()).isTrue();
        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(400);
        assertThat(out.getHeight()).isEqualTo(300);
        assertThat(result.textResult())
                .contains("경고")
                .contains("200x150")
                .contains("400x300");
    }

    @Test
    void preventUpscaleClampsOnlyTheAxisThatWouldEnlarge() throws Exception {
        // 가로만 확대(200%), 세로는 축소(50%) 요청 — preventUpscale은 확대되는 축(너비)만 원본으로 묶어야 한다.
        Path src = createPng("mixed-upscale.png", 200, 150);

        ToolResult result = module.process(new ToolInput(List.of(src),
                Map.of("unit", "%", "width", "200", "height", "50")));

        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        // 박스(200x75)에 종횡비 유지로 맞추면 폭 기준(200/200=1.0) vs 높이 기준(75/150=0.5) 중 작은 배율 적용 → 100x75
        assertThat(out.getWidth()).isEqualTo(100);
        assertThat(out.getHeight()).isEqualTo(75);
    }

    @Test
    void preventUpscaleClampsInPxModeToo() throws Exception {
        Path src = createPng("px-upscale.png", 100, 80);

        ToolResult result = module.process(new ToolInput(List.of(src),
                Map.of("width", "500", "height", "400")));

        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(100);
        assertThat(out.getHeight()).isEqualTo(80);
    }

    @Test
    void downscaleHasNoAdvisory() throws Exception {
        Path src = createPng("downscale.png", 200, 150);

        ToolResult result = module.process(new ToolInput(
                List.of(src), Map.of("width", "100", "height", "75")));

        assertThat(result.textResult()).isNull();
    }

    @Test
    void jpegQualityLowersFileSize() throws Exception {
        Path src = createNoisyJpg("quality.jpg", 300, 300);

        ToolResult low = module.process(new ToolInput(List.of(src),
                Map.of("width", "300", "height", "300", "quality", "50")));
        ToolResult high = module.process(new ToolInput(List.of(src),
                Map.of("width", "300", "height", "300", "quality", "95")));

        // 둘 다 유효한 이미지 + 같은 크기여야 하고, 품질 50이 95보다 파일이 확실히 작아야 한다
        BufferedImage lowImg = ImageIO.read(low.outputFile().toFile());
        BufferedImage highImg = ImageIO.read(high.outputFile().toFile());
        assertThat(lowImg.getWidth()).isEqualTo(300);
        assertThat(highImg.getWidth()).isEqualTo(300);
        assertThat(low.outputFile().toFile().length())
                .isLessThan(high.outputFile().toFile().length());
    }

    @Test
    void invalidUnitRejected() throws Exception {
        Path src = createPng("bad-unit.png", 100, 100);

        assertThatThrownBy(() -> module.process(new ToolInput(
                List.of(src), Map.of("unit", "pt", "width", "50", "height", "50"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("unit");
    }

    @Test
    void webpInputFallsBackToPngOutputSinceWebpWritingIsUnsupported() throws Exception {
        // TwelveMonkeys의 WebP 플러그인은 읽기 전용이라, 원본 확장자를 그대로 쓰면(.webp)
        // 쓰기 가능한 라이터가 없어 실패한다 — png로 대체되는지, 리사이즈 자체는 정상 동작하는지 확인.
        // 픽셀도 함께 확인해 디코딩 자체가 실제로 맞게 됐는지 본다(윗절반 빨강/아랫절반 초록, 40x40).
        Path src = Path.of("src/test/resources/samples/test.webp");

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of("width", "20", "height", "20")));

        assertThat(result.outputFile().toString()).endsWith(".png");
        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(20);
        assertThat(out.getHeight()).isEqualTo(20);
        java.awt.Color top = new java.awt.Color(out.getRGB(10, 2));
        java.awt.Color bottom = new java.awt.Color(out.getRGB(10, 18));
        assertThat(top.getRed()).isGreaterThan(200);
        assertThat(top.getGreen()).isLessThan(100);
        assertThat(bottom.getGreen()).isGreaterThan(200);
        assertThat(bottom.getRed()).isLessThan(100);
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("image-resize");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("image");
    }
}
