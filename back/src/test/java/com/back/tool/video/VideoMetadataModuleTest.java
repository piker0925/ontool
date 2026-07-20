package com.back.tool.video;

import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VideoMetadataModuleTest {

    @TempDir
    Path tempDir;

    private final FfprobeSupport ffprobe = new FfprobeSupport("ffprobe");
    private final VideoMetadataModule module = new VideoMetadataModule(ffprobe);
    private final ObjectMapper mapper = new ObjectMapper();

    private Path generateTestVideo(String name, double durationSeconds, int width, int height, boolean withAudio) throws Exception {
        Path output = tempDir.resolve(name);
        List<String> cmd = new java.util.ArrayList<>(List.of(
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", "testsrc=duration=" + durationSeconds + ":size=" + width + "x" + height + ":rate=25"));
        if (withAudio) {
            cmd.addAll(List.of("-f", "lavfi", "-i", "sine=frequency=440:duration=" + durationSeconds,
                    "-c:a", "aac"));
        }
        cmd.addAll(List.of("-c:v", "libx264", "-pix_fmt", "yuv420p", output.toAbsolutePath().toString()));
        Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
        p.getInputStream().readAllBytes();
        int exit = p.waitFor();
        if (exit != 0 || !Files.exists(output)) {
            throw new IllegalStateException("테스트용 영상 생성 실패(로컬에 ffmpeg 필요)");
        }
        return output;
    }

    private String valueOf(ToolResult result, String key) throws Exception {
        JsonNode root = mapper.readTree(result.textResult());
        for (JsonNode item : root.path("items")) {
            if (key.equals(item.path("key").asText())) {
                return item.path("value").asText();
            }
        }
        throw new AssertionError("키를 찾을 수 없습니다: " + key);
    }

    @Test
    void 해상도_코덱_길이_등_실제_값을_채운다() throws Exception {
        Path video = generateTestVideo("meta.mp4", 3.0, 320, 240, true);

        ToolResult result = module.process(new ToolInput(List.of(video), Map.of()));

        assertThat(result.isFile()).isFalse();
        assertThat(valueOf(result, "해상도")).isEqualTo("320x240");
        assertThat(valueOf(result, "비디오 코덱")).isEqualTo("h264");
        assertThat(Double.parseDouble(valueOf(result, "길이(초)"))).isCloseTo(3.0, org.assertj.core.api.Assertions.within(0.5));
        assertThat(valueOf(result, "오디오 코덱")).isEqualTo("aac");
        assertThat(Long.parseLong(valueOf(result, "파일 크기(bytes)"))).isEqualTo(Files.size(video));
        assertThat(Double.parseDouble(valueOf(result, "프레임레이트(fps)"))).isCloseTo(25.0, org.assertj.core.api.Assertions.within(0.5));
        assertThat(Long.parseLong(valueOf(result, "전체 비트레이트(bps)"))).isGreaterThan(0);
    }

    @Test
    void 오디오_트랙이_없어도_에러_없이_처리한다() throws Exception {
        Path video = generateTestVideo("silent.mp4", 2.0, 320, 240, false);

        ToolResult result = module.process(new ToolInput(List.of(video), Map.of()));

        assertThat(valueOf(result, "오디오 코덱")).isEqualTo("없음");
    }

    @Test
    void 디코딩_불가능한_파일이면_명확한_에러를_던진다() throws Exception {
        Path notAVideo = tempDir.resolve("not-a-video.mp4");
        Files.writeString(notAVideo, "이건 영상이 아닙니다");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(notAVideo), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("분석할 수 없습니다");
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("video-metadata");
        assertThat(module.getCategory()).isEqualTo("video");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getLane()).isEqualTo(Lane.HEAVY);
    }
}
