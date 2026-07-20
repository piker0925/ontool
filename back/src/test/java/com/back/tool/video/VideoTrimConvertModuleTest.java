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
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class VideoTrimConvertModuleTest {

    @TempDir
    Path tempDir;

    private final FfmpegSupport ffmpeg = new FfmpegSupport("ffmpeg");
    private final FfprobeSupport ffprobe = new FfprobeSupport("ffprobe");
    private final VideoTrimConvertModule module = new VideoTrimConvertModule(ffmpeg, ffprobe);

    /** GOP=25(1초당 키프레임 1개, 25fps)라 -c copy 트리밍의 키프레임 스냅 오차가 최대 1초로 예측 가능하다. */
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
    void 트리밍만_요청하면_c_copy_경로로_구간을_자른다() throws Exception {
        Path source = generateTestVideo("source.mp4", 6.0, 320, 240);

        ToolResult result = module.process(new ToolInput(
                List.of(source), Map.of("startTime", "1", "endTime", "3")));

        assertThat(result.isFile()).isTrue();
        double resultDuration = ffprobe.durationSeconds(result.outputFile());
        // -c copy는 키프레임(1초 간격)에 스냅되므로 정확히 2.0초가 아닐 수 있다 — 넉넉한 허용 오차.
        assertThat(resultDuration).isCloseTo(2.0, within(1.5));
    }

    @Test
    void 포맷_해상도_지정하면_재인코딩되어_실제로_반영된다() throws Exception {
        Path source = generateTestVideo("source.mp4", 2.0, 320, 240);

        ToolResult result = module.process(new ToolInput(
                List.of(source), Map.of("targetFormat", "webm", "resolution", "160x120")));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile().getFileName().toString()).endsWith(".webm");
        var root = ffprobe.probe(result.outputFile());
        var videoStream = root.path("streams").get(0);
        assertThat(videoStream.path("width").asInt()).isEqualTo(160);
        assertThat(videoStream.path("height").asInt()).isEqualTo(120);
        assertThat(videoStream.path("codec_name").asText()).isNotEqualTo("h264"); // webm은 vp8/vp9/av1 계열
    }

    @Test
    void 디코딩_불가능한_파일이면_명확한_에러를_던진다() throws Exception {
        Path notAVideo = tempDir.resolve("not-a-video.mp4");
        Files.writeString(notAVideo, "이건 영상이 아닙니다");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(notAVideo), Map.of())))
                .isInstanceOf(ToolProcessingException.class);
    }

    @Test
    void 재인코딩_경로에서_진행률이_0에서_100으로_점프하지_않고_중간값을_보고한다() throws Exception {
        // 충분히 긴 소스라야 인코딩 도중 여러 tick이 잡힌다.
        Path source = generateTestVideo("long.mp4", 5.0, 320, 240);
        List<Integer> reported = new CopyOnWriteArrayList<>();

        module.process(new ToolInput(List.of(source), Map.of("targetFormat", "mp4"),
                reported::add));

        assertThat(reported).isNotEmpty();
        assertThat(reported).anyMatch(p -> p > 0 && p < 100); // 중간값이 실제로 존재 — 0→100 점프가 아님
        // 단조 비감소(보고 순서가 뒤로 가지 않음)
        for (int i = 1; i < reported.size(); i++) {
            assertThat(reported.get(i)).isGreaterThanOrEqualTo(reported.get(i - 1));
        }
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("video-trim-convert");
        assertThat(module.getCategory()).isEqualTo("video");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getLane()).isEqualTo(Lane.VIDEO);
    }
}
