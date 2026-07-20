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

class VideoToAudioModuleTest {

    @TempDir
    Path tempDir;

    private final FfmpegSupport ffmpeg = new FfmpegSupport("ffmpeg");
    private final FfprobeSupport ffprobe = new FfprobeSupport("ffprobe");
    private final VideoToAudioModule module = new VideoToAudioModule(ffmpeg, ffprobe);

    private Path generateTestVideo(String name, double durationSeconds, boolean withAudio) throws Exception {
        Path output = tempDir.resolve(name);
        List<String> cmd = new java.util.ArrayList<>(List.of(
                "ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=" + durationSeconds + ":size=320x240:rate=25"));
        if (withAudio) {
            cmd.addAll(List.of("-f", "lavfi", "-i", "sine=frequency=440:duration=" + durationSeconds, "-c:a", "aac"));
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

    @Test
    void mp3로_추출하면_실제_mp3로_디코드되고_길이가_근사한다() throws Exception {
        Path source = generateTestVideo("source.mp4", 4.0, true);

        ToolResult result = module.process(new ToolInput(List.of(source), Map.of("format", "mp3")));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile().getFileName().toString()).endsWith(".mp3");
        var root = ffprobe.probe(result.outputFile());
        var stream = root.path("streams").get(0);
        assertThat(stream.path("codec_name").asText()).isEqualTo("mp3");
        assertThat(ffprobe.durationSeconds(result.outputFile())).isCloseTo(4.0, within(0.5));
    }

    @Test
    void wav로_추출하면_실제_pcm_wav로_디코드된다() throws Exception {
        Path source = generateTestVideo("source.mp4", 2.0, true);

        ToolResult result = module.process(new ToolInput(List.of(source), Map.of("format", "wav")));

        assertThat(result.outputFile().getFileName().toString()).endsWith(".wav");
        var root = ffprobe.probe(result.outputFile());
        assertThat(root.path("streams").get(0).path("codec_name").asText()).startsWith("pcm_");
    }

    @Test
    void 결과에는_비디오_스트림이_없다() throws Exception {
        Path source = generateTestVideo("source.mp4", 2.0, true);

        ToolResult result = module.process(new ToolInput(List.of(source), Map.of()));

        var root = ffprobe.probe(result.outputFile());
        boolean hasVideo = false;
        for (var stream : root.path("streams")) {
            if ("video".equals(stream.path("codec_type").asText())) hasVideo = true;
        }
        assertThat(hasVideo).isFalse();
    }

    @Test
    void 오디오_트랙이_없으면_처리_전에_명확한_에러() throws Exception {
        Path source = generateTestVideo("silent.mp4", 2.0, false);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(source), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("오디오 트랙이 없습니다");
    }

    @Test
    void 진행률_리포터가_실제_길이를_바탕으로_호출된다() throws Exception {
        // 오디오 전용 인코딩(libmp3lame/pcm)은 CPU 부담이 거의 없어 수 초짜리 클립도 수십 ms 안에
        // 끝나 ffmpeg가 out_time_ms tick을 여러 번 보낼 시간이 없다 — 그래서 "중간값을 여러 번 거친다"는
        // libx264 재인코딩(087 VideoTrimConvertModuleTest)만큼 강하게 검증할 수는 없다. 대신 이 테스트는
        // duration=0을 넘겨 진행률 계산 자체를 꺼버리는 회귀(예: 088의 palettegen pass처럼 진행률 보고를
        // 의도적으로 생략하는 패턴을 실수로 복붙)를 잡는다 — reported가 비어 있으면 그 버그가 있다는 뜻.
        Path source = generateTestVideo("clip.mp4", 5.0, true);
        List<Integer> reported = new CopyOnWriteArrayList<>();

        module.process(new ToolInput(List.of(source), Map.of("format", "wav"), reported::add));

        assertThat(reported).isNotEmpty();
        assertThat(reported).allMatch(p -> p >= 0 && p <= 99);
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("video-to-audio");
        assertThat(module.getCategory()).isEqualTo("video");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getLane()).isEqualTo(Lane.VIDEO);
    }
}
