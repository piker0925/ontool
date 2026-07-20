package com.back.tool.video;

import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VideoFrameExtractModuleTest {

    @TempDir
    Path tempDir;

    private final FfmpegSupport ffmpeg = new FfmpegSupport("ffmpeg");
    private final FfprobeSupport ffprobe = new FfprobeSupport("ffprobe");
    private final VideoFrameExtractModule module = new VideoFrameExtractModule(ffmpeg, ffprobe);

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

    private List<String> zipEntryNames(Path zip) throws IOException {
        List<String> names = new java.util.ArrayList<>();
        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(zip))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                names.add(entry.getName());
            }
        }
        return names;
    }

    @Test
    void totalFrames를_지정하면_정확히_그_장수만큼_추출한다() throws Exception {
        Path source = generateTestVideo("source.mp4", 6.0, 320, 240);

        ToolResult result = module.process(new ToolInput(List.of(source), Map.of("totalFrames", "4")));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile().getFileName().toString()).endsWith(".zip");
        List<byte[]> entries = zipEntryBytes(result.outputFile());
        assertThat(entries).hasSize(4);
        // testsrc는 시간에 따라 화면이 바뀌므로, 서로 다른 시점의 프레임이면 바이트가 달라야 한다
        // (같은 프레임이 반복 저장되는 버그를 카운트만으로는 잡지 못한다).
        assertThat(java.util.Set.copyOf(entries.stream().map(java.util.Arrays::hashCode).toList()))
                .hasSize(4);
        for (byte[] bytes : entries) {
            BufferedImage decoded = ImageIO.read(new java.io.ByteArrayInputStream(bytes));
            assertThat(decoded).isNotNull();
            assertThat(decoded.getWidth()).isEqualTo(320);
        }
    }

    private List<byte[]> zipEntryBytes(Path zip) throws IOException {
        List<byte[]> contents = new java.util.ArrayList<>();
        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(zip))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                contents.add(zis.readAllBytes());
            }
        }
        return contents;
    }

    @Test
    void intervalSeconds를_지정하면_길이_나누기_간격에_근사한_수를_추출한다() throws Exception {
        Path source = generateTestVideo("source.mp4", 6.0, 320, 240);

        ToolResult result = module.process(new ToolInput(List.of(source), Map.of("intervalSeconds", "2")));

        assertThat(zipEntryNames(result.outputFile())).hasSizeBetween(2, 3); // 6/2=3, 반올림 오차 허용
    }

    @Test
    void format이_jpg면_실제로_JPEG로_디코드된다() throws Exception {
        Path source = generateTestVideo("source.mp4", 3.0, 320, 240);

        ToolResult result = module.process(new ToolInput(
                List.of(source), Map.of("totalFrames", "1", "format", "jpg")));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile().getFileName().toString()).endsWith(".jpg");
        BufferedImage decoded = ImageIO.read(result.outputFile().toFile());
        assertThat(decoded).isNotNull();
        assertThat(decoded.getWidth()).isEqualTo(320);
    }

    @Test
    void 프레임이_1장이면_zip이_아니라_이미지_파일_그대로_반환한다() throws Exception {
        Path source = generateTestVideo("source.mp4", 3.0, 320, 240);

        ToolResult result = module.process(new ToolInput(List.of(source), Map.of("totalFrames", "1")));

        assertThat(result.outputFile().getFileName().toString()).endsWith(".png");
        assertThat(ImageIO.read(result.outputFile().toFile())).isNotNull();
    }

    @Test
    void 상한을_넘는_프레임_수는_처리_전에_거부한다() throws Exception {
        Path source = generateTestVideo("source.mp4", 3.0, 320, 240);

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(source), Map.of("totalFrames", "101"))))
                .isInstanceOf(ToolProcessingException.class);
    }

    @Test
    void intervalSeconds와_totalFrames를_동시에_지정하면_에러() throws Exception {
        Path source = generateTestVideo("source.mp4", 3.0, 320, 240);

        assertThatThrownBy(() -> module.process(new ToolInput(
                List.of(source), Map.of("intervalSeconds", "1", "totalFrames", "3"))))
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
        assertThat(module.getId()).isEqualTo("video-frame-extract");
        assertThat(module.getCategory()).isEqualTo("video");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getLane()).isEqualTo(Lane.VIDEO);
    }
}
