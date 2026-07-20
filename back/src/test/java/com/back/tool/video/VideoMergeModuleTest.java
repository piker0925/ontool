package com.back.tool.video;

import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class VideoMergeModuleTest {

    @TempDir
    Path tempDir;

    private final FfmpegSupport ffmpeg = new FfmpegSupport("ffmpeg");
    private final FfprobeSupport ffprobe = new FfprobeSupport("ffprobe");
    private final VideoMergeModule module = new VideoMergeModule(ffmpeg, ffprobe);

    private Path generateColorClip(String name, String color, double durationSeconds, int width, int height,
                                    boolean withAudio) throws Exception {
        Path output = tempDir.resolve(name);
        List<String> cmd = new java.util.ArrayList<>(List.of(
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", "color=c=" + color + ":size=" + width + "x" + height + ":duration=" + durationSeconds + ":rate=25"));
        if (withAudio) {
            cmd.addAll(List.of("-f", "lavfi", "-i", "sine=frequency=440:duration=" + durationSeconds, "-c:a", "aac"));
        }
        cmd.addAll(List.of("-c:v", "libx264", "-pix_fmt", "yuv420p", output.toAbsolutePath().toString()));
        Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
        p.getInputStream().readAllBytes();
        if (p.waitFor() != 0 || !Files.exists(output)) {
            throw new IllegalStateException("테스트용 영상 생성 실패(로컬에 ffmpeg 필요)");
        }
        return output;
    }

    /** 지정 시각의 프레임을 PNG로 뽑아 평균 RGB를 돌려준다 — 병합 순서가 실제로 반영됐는지 색으로 확인. */
    private int[] averageColorAt(Path video, double atSeconds) throws Exception {
        Process p = new ProcessBuilder(
                "ffmpeg", "-y", "-ss", String.valueOf(atSeconds), "-i", video.toAbsolutePath().toString(),
                "-vframes", "1", "-f", "image2pipe", "-vcodec", "png", "-")
                .redirectErrorStream(false)
                .start();
        byte[] pngBytes = p.getInputStream().readAllBytes();
        p.getErrorStream().readAllBytes();
        if (p.waitFor() != 0 || pngBytes.length == 0) {
            throw new IllegalStateException("프레임 추출 실패");
        }
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(pngBytes));
        long r = 0, g = 0, b = 0;
        int count = 0;
        for (int x = 0; x < image.getWidth(); x += 10) {
            for (int y = 0; y < image.getHeight(); y += 10) {
                int rgb = image.getRGB(x, y);
                r += (rgb >> 16) & 0xFF;
                g += (rgb >> 8) & 0xFF;
                b += rgb & 0xFF;
                count++;
            }
        }
        return new int[]{(int) (r / count), (int) (g / count), (int) (b / count)};
    }

    @Test
    void 코덱_해상도가_같으면_c_copy_경로로_빠르게_합친다() throws Exception {
        Path clip1 = generateColorClip("clip1.mp4", "red", 2.0, 320, 240, true);
        Path clip2 = generateColorClip("clip2.mp4", "blue", 2.0, 320, 240, true);

        ToolResult result = module.process(new ToolInput(List.of(clip1, clip2), Map.of()));

        assertThat(result.isFile()).isTrue();
        assertThat(ffprobe.durationSeconds(result.outputFile())).isCloseTo(4.0, within(0.5));
    }

    @Test
    void 해상도가_다르면_재인코딩되어_유효한_영상을_만든다() throws Exception {
        Path clip1 = generateColorClip("clip1.mp4", "red", 2.0, 320, 240, true);
        Path clip2 = generateColorClip("clip2.mp4", "blue", 2.0, 640, 480, true);

        ToolResult result = module.process(new ToolInput(List.of(clip1, clip2), Map.of()));

        var root = ffprobe.probe(result.outputFile());
        boolean hasVideo = false, hasAudio = false;
        for (var stream : root.path("streams")) {
            if ("video".equals(stream.path("codec_type").asText())) hasVideo = true;
            if ("audio".equals(stream.path("codec_type").asText())) hasAudio = true;
        }
        assertThat(hasVideo).isTrue();
        assertThat(hasAudio).isTrue();
        assertThat(ffprobe.durationSeconds(result.outputFile())).isCloseTo(4.0, within(0.7));
    }

    @Test
    void 순서가_실제로_반영된다() throws Exception {
        Path redFirst = generateColorClip("red.mp4", "red", 2.0, 320, 240, true);
        Path blueSecond = generateColorClip("blue.mp4", "blue", 2.0, 640, 480, true); // 해상도 다름 → 재인코딩 경로

        ToolResult result = module.process(new ToolInput(List.of(redFirst, blueSecond), Map.of()));

        int[] earlyColor = averageColorAt(result.outputFile(), 0.5); // 1번 클립(빨강) 구간
        int[] lateColor = averageColorAt(result.outputFile(), 3.0);  // 2번 클립(파랑) 구간

        assertThat(earlyColor[0]).isGreaterThan(earlyColor[2]); // red > blue
        assertThat(lateColor[2]).isGreaterThan(lateColor[0]);   // blue > red
    }

    @Test
    void 오디오_없는_클립과_있는_클립이_섞여도_재인코딩_경로에서_에러없이_처리한다() throws Exception {
        Path withAudio = generateColorClip("with-audio.mp4", "green", 2.0, 320, 240, true);
        Path withoutAudio = generateColorClip("no-audio.mp4", "yellow", 2.0, 640, 480, false); // 해상도 다름

        ToolResult result = module.process(new ToolInput(List.of(withAudio, withoutAudio), Map.of()));

        assertThat(result.isFile()).isTrue();
        var root = ffprobe.probe(result.outputFile());
        boolean hasAudio = false;
        for (var stream : root.path("streams")) {
            if ("audio".equals(stream.path("codec_type").asText())) hasAudio = true;
        }
        assertThat(hasAudio).isTrue(); // 무음 트랙 합성으로 오디오 스트림 자체는 존재
    }

    @Test
    void 파일이_1개면_에러() throws Exception {
        Path clip = generateColorClip("only.mp4", "red", 2.0, 320, 240, true);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(clip), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("2개 이상");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("video-merge");
        assertThat(module.getCategory()).isEqualTo("video");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.acceptsMultipleFiles()).isTrue();
        assertThat(module.getLane()).isEqualTo(Lane.VIDEO);
    }

    // isUniform()의 -c copy 판정 로직을 실제 ffmpeg 없이 직접 검증한다 — 위 통합 테스트들은
    // 결과 duration만으로는 copy 경로가 실제로 탔는지 구분하지 못하므로, 판정 자체를 단위로 고정한다.
    private final ObjectMapper mapper = new ObjectMapper();

    private JsonNode videoProbe(String codec, int width, int height, String pixFmt, String sar, String frameRate) throws Exception {
        return mapper.readTree("""
                {"streams":[{"codec_type":"video","codec_name":"%s","width":%d,"height":%d,
                "pix_fmt":"%s","sample_aspect_ratio":"%s","r_frame_rate":"%s"}]}
                """.formatted(codec, width, height, pixFmt, sar, frameRate));
    }

    @Test
    void isUniform_모든_속성이_같으면_true() throws Exception {
        JsonNode a = videoProbe("h264", 320, 240, "yuv420p", "1:1", "25/1");
        JsonNode b = videoProbe("h264", 320, 240, "yuv420p", "1:1", "25/1");

        assertThat(module.isUniform(List.of(a, b))).isTrue();
    }

    @Test
    void isUniform_해상도가_다르면_false() throws Exception {
        JsonNode a = videoProbe("h264", 320, 240, "yuv420p", "1:1", "25/1");
        JsonNode b = videoProbe("h264", 640, 480, "yuv420p", "1:1", "25/1");

        assertThat(module.isUniform(List.of(a, b))).isFalse();
    }

    @Test
    void isUniform_픽셀_종횡비가_다르면_false() throws Exception {
        JsonNode a = videoProbe("h264", 320, 240, "yuv420p", "1:1", "25/1");
        JsonNode b = videoProbe("h264", 320, 240, "yuv420p", "4:3", "25/1");

        assertThat(module.isUniform(List.of(a, b))).isFalse();
    }

    @Test
    void isUniform_프레임레이트가_다르면_false() throws Exception {
        JsonNode a = videoProbe("h264", 320, 240, "yuv420p", "1:1", "25/1");
        JsonNode b = videoProbe("h264", 320, 240, "yuv420p", "1:1", "30/1");

        assertThat(module.isUniform(List.of(a, b))).isFalse();
    }

    @Test
    void isUniform_코덱이_다르면_false() throws Exception {
        JsonNode a = videoProbe("h264", 320, 240, "yuv420p", "1:1", "25/1");
        JsonNode b = videoProbe("vp9", 320, 240, "yuv420p", "1:1", "25/1");

        assertThat(module.isUniform(List.of(a, b))).isFalse();
    }
}
