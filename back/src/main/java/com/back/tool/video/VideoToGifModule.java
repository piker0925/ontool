package com.back.tool.video;

import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * 영상 구간을 GIF로 변환. ImageIO 기반 {@code GifModule}(이미지 시퀀스 전용) 대신 FFmpeg의
 * 2-pass palette 생성(palettegen→paletteuse)을 쓴다 — 연속 그라디언트가 많은 영상에서 화질이
 * 뚜렷이 낫고, 프레임을 PNG로 뽑아 GifModule에 왕복시키는 것보다 구조가 단순하다(037).
 */
@Component
@RequiredArgsConstructor
public class VideoToGifModule implements ToolModule {

    private final FfmpegSupport ffmpeg;
    private final FfprobeSupport ffprobe;

    @Override
    public String getId() { return "video-to-gif"; }

    @Override
    public String getName() { return "영상 → GIF"; }

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

        boolean hasStart = params.has("startTime");
        boolean hasEnd = params.has("endTime");
        double startTime = params.getDouble("startTime", 0, 0, Double.MAX_VALUE);
        double endTime = hasEnd ? params.getDouble("endTime", 0, 0, Double.MAX_VALUE) : -1;
        if (hasEnd && endTime <= startTime) {
            throw new ToolProcessingException("endTime은 startTime보다 커야 합니다.");
        }
        int fps = params.getInt("fps", 10, 1, 30);
        int width = params.has("width") ? params.getInt("width", 0, 1, 10000) : -1;

        double sourceDuration = ffprobe.durationSeconds(source);
        double clipDuration = hasEnd ? endTime - startTime : sourceDuration - startTime;

        String scale = "scale=" + (width > 0 ? width : "iw") + ":-1:flags=lanczos";
        String fpsFilter = "fps=" + fps;

        Path palette;
        Path output;
        try {
            palette = Files.createTempFile("gif-palette-", ".png");
            output = Files.createTempFile("video-gif-", ".gif");
        } catch (IOException e) {
            throw new ToolProcessingException("임시 파일 생성에 실패했습니다: " + e.getMessage(), e);
        }

        try {
            List<String> pass1 = clipArgs(source, hasStart, startTime, hasEnd, clipDuration);
            pass1.add("-vf");
            pass1.add(fpsFilter + "," + scale + ",palettegen");
            pass1.add(palette.toAbsolutePath().toString());
            ffmpeg.run(pass1, 0, input.progressReporter()); // 팔레트 생성은 빠르므로 진행률 보고 생략

            List<String> pass2 = clipArgs(source, hasStart, startTime, hasEnd, clipDuration);
            pass2.add("-i");
            pass2.add(palette.toAbsolutePath().toString());
            pass2.add("-filter_complex");
            pass2.add(fpsFilter + "," + scale + "[x];[x][1:v]paletteuse");
            pass2.add(output.toAbsolutePath().toString());
            ffmpeg.run(pass2, clipDuration, input.progressReporter());

            return ToolResult.ofFile(output);
        } finally {
            // palette.png는 output과 달리 결과물이 아니라 pass1→pass2 사이의 중간 산출물이라
            // ToolResult로 나가지 않는다 — 여기서 안 지우면 매 호출마다 시스템 임시 디렉토리에 쌓인다.
            try {
                Files.deleteIfExists(palette);
            } catch (IOException ignored) {
                // 삭제 실패는 무시 — OS가 언젠가 임시 디렉토리를 정리한다
            }
        }
    }

    // -ss·-t는 반드시 -i "바로 앞"에 붙어 있어야 그 입력에만 적용된다 — 이 메서드 뒤에 palette.png용
    // -i가 하나 더 붙는데(두 번째 pass), -t를 -i 뒤에 두면 ffmpeg가 그걸 "다음 -i"의 옵션으로 오인해
    // 정작 소스 트리밍은 적용되지 않는다(직접 재현·확인한 ffmpeg CLI 동작).
    private List<String> clipArgs(Path source, boolean hasStart, double startTime, boolean hasEnd, double clipDuration) {
        List<String> args = new ArrayList<>();
        if (hasStart) {
            args.add("-ss");
            args.add(String.valueOf(startTime));
        }
        if (hasEnd) {
            args.add("-t");
            args.add(String.valueOf(clipDuration));
        }
        args.add("-i");
        args.add(source.toAbsolutePath().toString());
        return args;
    }
}
