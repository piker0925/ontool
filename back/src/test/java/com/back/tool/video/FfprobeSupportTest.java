package com.back.tool.video;

import com.back.tool.model.ToolProcessingException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class FfprobeSupportTest {

    @TempDir
    Path tempDir;

    private final FfprobeSupport ffprobe = new FfprobeSupport("ffprobe");

    /** lavfi testsrc로 길이·해상도가 정확히 알려진 합성 영상을 만든다 — 커밋된 바이너리 샘플 불필요. */
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
    void durationSeconds_returns실제_길이() throws Exception {
        Path video = generateTestVideo("4s.mp4", 4.0, 320, 240);

        double duration = ffprobe.durationSeconds(video);

        assertThat(duration).isCloseTo(4.0, within(0.3));
    }

    @Test
    void probe_해상도와_코덱을_포함한다() throws Exception {
        Path video = generateTestVideo("res.mp4", 1.0, 320, 240);

        var root = ffprobe.probe(video);
        var videoStream = root.path("streams").get(0);

        assertThat(videoStream.path("width").asInt()).isEqualTo(320);
        assertThat(videoStream.path("height").asInt()).isEqualTo(240);
        assertThat(videoStream.path("codec_name").asText()).isEqualTo("h264");
    }

    @Test
    void 디코딩할_수_없는_파일이면_명확한_에러() throws Exception {
        Path notAVideo = tempDir.resolve("not-a-video.mp4");
        Files.writeString(notAVideo, "이건 영상이 아닙니다");

        assertThatThrownBy(() -> ffprobe.durationSeconds(notAVideo))
                .isInstanceOf(ToolProcessingException.class);
    }
}
