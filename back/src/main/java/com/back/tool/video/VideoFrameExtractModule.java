package com.back.tool.video;

import com.back.global.util.FilenameSanitizer;
import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** 영상에서 정지 프레임을 N초 간격 또는 총 N장 균등으로 뽑는다. VIDEO 레인(037). */
@Component
@RequiredArgsConstructor
public class VideoFrameExtractModule implements ToolModule {

    /** 무제한 파일 생성으로 디스크·ZIP 크기가 커지는 것을 막는 상한. */
    private static final int MAX_FRAMES = 100;

    private final FfmpegSupport ffmpeg;
    private final FfprobeSupport ffprobe;

    @Override
    public String getId() { return "video-frame-extract"; }

    @Override
    public String getName() { return "프레임 추출"; }

    @Override
    public String getCategory() { return "video"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public Lane getLane() { return Lane.VIDEO; }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        Path source = input.files().get(0);
        ToolParams params = ToolParams.of(input);

        boolean hasInterval = params.has("intervalSeconds");
        boolean hasTotal = params.has("totalFrames");
        if (hasInterval && hasTotal) {
            throw new ToolProcessingException("intervalSeconds와 totalFrames는 동시에 지정할 수 없습니다.");
        }
        String format = params.getString("format", "png");
        if (!format.equals("png") && !format.equals("jpg")) {
            throw new ToolProcessingException("format은 png 또는 jpg여야 합니다. (입력값: " + format + ")");
        }
        int width = params.has("width") ? params.getInt("width", 0, 1, 10000) : -1;

        double duration = ffprobe.durationSeconds(source);
        double fps;
        int expectedFrames;
        if (hasTotal) {
            expectedFrames = params.getInt("totalFrames", 0, 1, MAX_FRAMES);
            // duration 그대로 나누면 마지막 샘플 시각이 ffprobe가 보고한 길이와 거의 같아져, 컨테이너
            // duration과 실제 디코드 가능한 마지막 프레임 타임스탬프가 미세하게 어긋나는 소스(가변
            // 프레임레이트 등)에서 마지막 한 장이 드롭될 수 있다. 살짝 짧게 잡아 여유를 둔다.
            fps = expectedFrames / Math.max(0.01, duration - 0.05);
        } else {
            double intervalSeconds = params.getDouble("intervalSeconds", 5, 0.1, Double.MAX_VALUE);
            fps = 1.0 / intervalSeconds;
            expectedFrames = (int) Math.ceil(duration / intervalSeconds);
        }
        if (expectedFrames > MAX_FRAMES) {
            throw new ToolProcessingException(
                    "추출될 프레임 수(" + expectedFrames + ")가 상한(" + MAX_FRAMES + ")을 초과합니다. "
                            + "구간을 좁히거나 간격을 늘려주세요.");
        }

        Path frameDir;
        try {
            frameDir = Files.createTempDirectory("video-frames-");
        } catch (IOException e) {
            throw new ToolProcessingException("임시 디렉토리 생성에 실패했습니다: " + e.getMessage(), e);
        }

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(source.toAbsolutePath().toString());
        String scale = width > 0 ? ",scale=" + width + ":-1:flags=lanczos" : "";
        args.add("-vf");
        args.add("fps=" + fps + scale);
        args.add("-vframes");
        args.add(String.valueOf(expectedFrames));
        if (format.equals("jpg")) {
            args.add("-q:v");
            args.add("2"); // 높은 품질(libjpeg qscale 1~31, 낮을수록 고품질)
        }
        args.add(frameDir.resolve("frame-%03d." + format).toAbsolutePath().toString());

        ffmpeg.run(args, duration, input.progressReporter());

        try {
            List<Path> frames;
            try (Stream<Path> listed = Files.list(frameDir)) {
                frames = listed.sorted(Comparator.naturalOrder()).toList();
            } catch (IOException e) {
                throw new ToolProcessingException("추출된 프레임을 읽는 중 실패했습니다: " + e.getMessage(), e);
            }
            if (frames.isEmpty()) {
                throw new ToolProcessingException("프레임을 추출하지 못했습니다.");
            }
            if (frames.size() == 1) {
                // frameDir은 아래 finally에서 통째로 지워지므로, 반환할 결과 파일은 밖으로 복사해 둔다.
                try {
                    Path single = Files.createTempFile("video-frame-", "." + format);
                    Files.copy(frames.get(0), single, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    return ToolResult.ofFile(single);
                } catch (IOException e) {
                    throw new ToolProcessingException("프레임 결과 저장에 실패했습니다: " + e.getMessage(), e);
                }
            }
            return ToolResult.ofFile(zipFrames(frames, source));
        } finally {
            deleteRecursively(frameDir);
        }
    }

    private void deleteRecursively(Path dir) {
        try (Stream<Path> paths = Files.walk(dir)) {
            paths.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                    // 삭제 실패는 무시 — OS가 언젠가 임시 디렉토리를 정리한다
                }
            });
        } catch (IOException ignored) {
            // 목록 조회 실패도 동일하게 무시
        }
    }

    private Path zipFrames(List<Path> frames, Path source) {
        String prefix = FilenameSanitizer.baseName(source.getFileName().toString(), "frames");

        try {
            Path zipPath = Files.createTempFile("video-frames-", ".zip");
            try (OutputStream fos = Files.newOutputStream(zipPath);
                 ZipOutputStream zip = new ZipOutputStream(fos)) {
                for (Path frame : frames) {
                    zip.putNextEntry(new ZipEntry(prefix + "-" + frame.getFileName()));
                    Files.copy(frame, zip);
                    zip.closeEntry();
                }
            }
            return zipPath;
        } catch (IOException e) {
            throw new ToolProcessingException("프레임 ZIP 생성에 실패했습니다: " + e.getMessage(), e);
        }
    }
}
