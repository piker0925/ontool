package com.back.tool.video;

import com.back.support.RequiresFfmpegDrawtext;
import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VideoWatermarkModuleTest {

    @TempDir
    Path tempDir;

    private final FfmpegSupport ffmpeg = new FfmpegSupport("ffmpeg");
    private final FfprobeSupport ffprobe = new FfprobeSupport("ffprobe");
    private final VideoWatermarkModule module = new VideoWatermarkModule(ffmpeg, ffprobe);

    private Path generateTestVideo(String name, double durationSeconds, int width, int height) throws Exception {
        Path output = tempDir.resolve(name);
        Process p = new ProcessBuilder(
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", "color=c=black:size=" + width + "x" + height + ":duration=" + durationSeconds + ":rate=25",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", output.toAbsolutePath().toString())
                .redirectErrorStream(true).start();
        p.getInputStream().readAllBytes();
        if (p.waitFor() != 0 || !Files.exists(output)) {
            throw new IllegalStateException("테스트용 영상 생성 실패(로컬에 ffmpeg 필요)");
        }
        return output;
    }

    private Path generateWatermarkImage(String name, int width, int height, Color color) throws Exception {
        Path output = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, width, height);
        g.dispose();
        ImageIO.write(img, "png", output.toFile());
        return output;
    }

    /** 지정 좌표의 픽셀 색을 뽑는다 — 워터마크가 실제로 합성됐는지 픽셀로 확인. */
    private int[] pixelAt(Path video, double atSeconds, int x, int y) throws Exception {
        Process p = new ProcessBuilder(
                "ffmpeg", "-y", "-ss", String.valueOf(atSeconds), "-i", video.toAbsolutePath().toString(),
                "-vframes", "1", "-f", "image2pipe", "-vcodec", "png", "-")
                .start();
        byte[] pngBytes = p.getInputStream().readAllBytes();
        p.getErrorStream().readAllBytes();
        if (p.waitFor() != 0 || pngBytes.length == 0) {
            throw new IllegalStateException("프레임 추출 실패");
        }
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(pngBytes));
        int rgb = image.getRGB(x, y);
        return new int[]{(rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF};
    }

    @Test
    void 이미지_워터마크_퍼센트_좌표를_주지_않으면_레거시대로_우하단_고정_위치에_합성된다() throws Exception {
        // 115: 위치 선택 옵션(enum) 제거 — 129: 그 대신 퍼센트 좌표로 자유 배치할 수 있게 됐지만,
        // 퍼센트 파라미터를 아예 안 보내면 여전히 우하단 고정이어야 한다(하위 호환 폴백).
        Path video = generateTestVideo("black.mp4", 2.0, 320, 240);
        Path watermark = generateWatermarkImage("wm.png", 100, 100, Color.RED);

        ToolResult result = module.process(new ToolInput(
                List.of(video, watermark), Map.of("opacity", "100")));

        // 우하단 고정: x=320-100-20=200~300, y=240-100-20=120~220 범위 — 그 안의 한 점을 확인
        int[] bottomRight = pixelAt(result.outputFile(), 1.0, 250, 170);
        assertThat(bottomRight[0]).isGreaterThan(150); // 빨강 워터마크가 검은 배경 위에 실제로 보임
        assertThat(bottomRight[1]).isLessThan(100);

        // 패턴 B: 반대쪽(좌상단)은 오염되지 않아야 한다 — 위치가 "우하단"이 아니라 전체/중앙에
        // 퍼지는 회귀였다면 이 점도 빨갛게 물들었을 것이다.
        int[] topLeft = pixelAt(result.outputFile(), 1.0, 40, 40);
        assertThat(topLeft[0]).isLessThan(50);
    }

    @Test
    void 이미지_워터마크에_퍼센트_좌표를_주면_그_위치에_합성되고_레거시_우하단_자리는_오염되지_않는다() throws Exception {
        // 129: xPercent=0/yPercent=0(좌상단 앵커) — 레거시 우하단 고정 폴백과 명백히 다른 위치를
        // 지정해, "좁게 맞는 것"과 "넓게 잘못된 것"을 구분한다.
        Path video = generateTestVideo("black.mp4", 2.0, 320, 240);
        Path watermark = generateWatermarkImage("wm.png", 100, 100, Color.RED);

        ToolResult result = module.process(new ToolInput(
                List.of(video, watermark),
                Map.of("opacity", "100", "imageXPercent", "0", "imageYPercent", "0")));

        int[] topLeft = pixelAt(result.outputFile(), 1.0, 40, 40);
        assertThat(topLeft[0]).as("좌상단 퍼센트로 지정했으니 좌상단에 빨강이 보여야 한다").isGreaterThan(150);
        assertThat(topLeft[1]).isLessThan(100);

        int[] bottomRight = pixelAt(result.outputFile(), 1.0, 250, 170);
        assertThat(bottomRight[0]).as("레거시 우하단 자리는 오염되지 않아야 한다").isLessThan(50);
    }

    @Test
    @RequiresFfmpegDrawtext
    void 텍스트_워터마크가_실제로_합성된다() throws Exception {
        // 115: 텍스트 워터마크도 이미지와 동일하게 우하단 고정 위치에 그려진다.
        Path video = generateTestVideo("black.mp4", 2.0, 320, 240);

        ToolResult withText = module.process(new ToolInput(
                List.of(video), Map.of("text", "TEST", "opacity", "100")));
        assertThat(withText.isFile()).isTrue();

        // 우하단 영역에서 검은 배경만 있는 원본과 달리, 박스 배경(boxcolor=black@opacity) 위에 흰
        // 글자가 그려지므로 최소 한 픽셀은 순수 검정(0,0,0)이 아니어야 한다.
        boolean anyNonBlack = false;
        for (int x = 150; x < 315 && !anyNonBlack; x += 3) {
            for (int y = 150; y < 225 && !anyNonBlack; y += 3) {
                int[] c = pixelAt(withText.outputFile(), 1.0, x, y);
                if (c[0] > 40 || c[1] > 40 || c[2] > 40) anyNonBlack = true;
            }
        }
        assertThat(anyNonBlack).isTrue();

        // 패턴 B: 반대쪽(좌상단)은 오염되지 않아야 한다 — "우하단 고정"이 아니라 전체 화면에
        // 텍스트가 반복되거나 중앙에 그려지는 회귀였다면 이 영역에도 흰 글자가 보였을 것이다.
        boolean topLeftNonBlack = false;
        for (int x = 10; x < 90 && !topLeftNonBlack; x += 3) {
            for (int y = 10; y < 70 && !topLeftNonBlack; y += 3) {
                int[] c = pixelAt(withText.outputFile(), 1.0, x, y);
                if (c[0] > 40 || c[1] > 40 || c[2] > 40) topLeftNonBlack = true;
            }
        }
        assertThat(topLeftNonBlack).isFalse();
    }

    @Test
    @RequiresFfmpegDrawtext
    void 특수문자가_포함된_텍스트도_필터_에러_없이_처리한다() throws Exception {
        Path video = generateTestVideo("black.mp4", 2.0, 320, 240);

        ToolResult result = module.process(new ToolInput(
                List.of(video), Map.of("text", "time: 10:30 100% 'quoted'")));

        assertThat(result.isFile()).isTrue();
        assertThat(ffprobe.probe(result.outputFile()).path("streams").isEmpty()).isFalse();
    }

    @Test
    void 텍스트도_워터마크_이미지도_없으면_에러() throws Exception {
        Path video = generateTestVideo("black.mp4", 1.0, 320, 240);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(video), Map.of())))
                .isInstanceOf(ToolProcessingException.class);
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("video-watermark");
        assertThat(module.getCategory()).isEqualTo("video");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.acceptsMultipleFiles()).isTrue();
        assertThat(module.getLane()).isEqualTo(Lane.VIDEO);
    }

    @Test
    void escapePathForFilter_콜론과_백슬래시를_이스케이프한다() {
        assertThat(module.escapePathForFilter("/tmp/a:b.txt")).isEqualTo("/tmp/a\\:b.txt");
        assertThat(module.escapePathForFilter("C:\\Users\\x.txt")).isEqualTo("C\\:\\\\Users\\\\x.txt");
        assertThat(module.escapePathForFilter("/plain/path.txt")).isEqualTo("/plain/path.txt");
    }
}
