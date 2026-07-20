package com.back.tool.video;

import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class VideoToGifModuleTest {

    @TempDir
    Path tempDir;

    private final FfmpegSupport ffmpeg = new FfmpegSupport("ffmpeg");
    private final FfprobeSupport ffprobe = new FfprobeSupport("ffprobe");
    private final VideoToGifModule module = new VideoToGifModule(ffmpeg, ffprobe);

    private Path generateTestVideo(String name, double durationSeconds, int width, int height) throws Exception {
        Path output = tempDir.resolve(name);
        Process p = new ProcessBuilder(
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", "testsrc=duration=" + durationSeconds + ":size=" + width + "x" + height + ":rate=25",
                "-c:v", "libx264", "-g", "25", "-pix_fmt", "yuv420p",
                output.toAbsolutePath().toString())
                .redirectErrorStream(true)
                .start();
        p.getInputStream().readAllBytes();
        int exit = p.waitFor();
        if (exit != 0 || !Files.exists(output)) {
            throw new IllegalStateException("테스트용 영상 생성 실패(로컬에 ffmpeg 필요)");
        }
        return output;
    }

    @Test
    void 구간을_지정하면_결과_gif_길이가_근사한다() throws Exception {
        Path source = generateTestVideo("source.mp4", 6.0, 320, 240);

        ToolResult result = module.process(new ToolInput(
                List.of(source), Map.of("startTime", "1", "endTime", "3", "fps", "10")));

        assertThat(result.isFile()).isTrue();
        double resultDuration = ffprobe.durationSeconds(result.outputFile());
        assertThat(resultDuration).isCloseTo(2.0, within(1.0));
    }

    @Test
    void fps와_width를_지정하면_실제_결과에_반영된다() throws Exception {
        Path source = generateTestVideo("source.mp4", 2.0, 320, 240);

        ToolResult result = module.process(new ToolInput(
                List.of(source), Map.of("fps", "8", "width", "160")));

        var root = ffprobe.probe(result.outputFile());
        var stream = root.path("streams").get(0);
        assertThat(stream.path("width").asInt()).isEqualTo(160);
        // GIF 프레임레이트는 avg_frame_rate(분수 문자열, 예: "8/1")로 노출된다.
        String avgFrameRate = stream.path("avg_frame_rate").asText();
        double actualFps = parseFraction(avgFrameRate);
        assertThat(actualFps).isCloseTo(8.0, within(1.0));
    }

    @Test
    void 결과_gif가_실제_픽셀_정보를_담고_있다() throws Exception {
        Path source = generateTestVideo("source.mp4", 2.0, 320, 240);

        ToolResult result = module.process(new ToolInput(List.of(source), Map.of()));

        long size = Files.size(result.outputFile());
        assertThat(size).isGreaterThan(1000); // 빈 파일/단색 GIF는 이 크기에 훨씬 못 미친다
        var root = ffprobe.probe(result.outputFile());
        assertThat(root.path("streams").get(0).path("codec_name").asText()).isEqualTo("gif");
    }

    @Test
    void 중간_산출물인_팔레트_파일을_남기지_않는다() throws Exception {
        Path source = generateTestVideo("source.mp4", 2.0, 320, 240);
        Path systemTempDir = Path.of(System.getProperty("java.io.tmpdir"));
        java.util.Set<Path> before = paletteFilesIn(systemTempDir);

        module.process(new ToolInput(List.of(source), Map.of()));

        java.util.Set<Path> after = paletteFilesIn(systemTempDir);
        after.removeAll(before); // 이 호출로 새로 생긴 팔레트 파일만 본다 — 다른 테스트/실행의 잔여물과 무관하게
        assertThat(after).isEmpty();
    }

    private java.util.Set<Path> paletteFilesIn(Path dir) throws java.io.IOException {
        try (var files = Files.list(dir)) {
            return files.filter(p -> p.getFileName().toString().startsWith("gif-palette-"))
                    .collect(java.util.stream.Collectors.toSet());
        }
    }

    @Test
    void 디코딩_불가능한_파일이면_명확한_에러를_던진다() throws Exception {
        Path notAVideo = tempDir.resolve("not-a-video.mp4");
        Files.writeString(notAVideo, "이건 영상이 아닙니다");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(notAVideo), Map.of())))
                .isInstanceOf(ToolProcessingException.class);
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("video-to-gif");
        assertThat(module.getCategory()).isEqualTo("video");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getLane()).isEqualTo(Lane.VIDEO);
    }

    private double parseFraction(String fraction) {
        String[] parts = fraction.split("/");
        double numerator = Double.parseDouble(parts[0]);
        double denominator = parts.length > 1 ? Double.parseDouble(parts[1]) : 1;
        return denominator == 0 ? 0 : numerator / denominator;
    }
}
