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

/** 영상 구간 자르기 + 컨테이너/해상도/비트레이트 변환. VIDEO 레인에서 처리하는 첫 모듈(037). */
@Component
@RequiredArgsConstructor
public class VideoTrimConvertModule implements ToolModule {

    private final FfmpegSupport ffmpeg;
    private final FfprobeSupport ffprobe;

    @Override
    public String getId() { return "video-trim-convert"; }

    @Override
    public String getName() { return "영상 트리밍/변환"; }

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

        String targetFormat = params.getString("targetFormat", null);
        String resolution = params.getString("resolution", null);
        if (resolution != null && !resolution.matches("\\d+x\\d+")) {
            throw new ToolProcessingException("resolution은 '가로x세로' 형식이어야 합니다. (입력값: " + resolution + ")");
        }
        Integer bitrateKbps = params.has("bitrate") ? params.getInt("bitrate", 0, 1, 1_000_000) : null;
        boolean needsReencode = targetFormat != null || resolution != null || bitrateKbps != null;

        double sourceDuration = ffprobe.durationSeconds(source);
        double clipDuration = hasEnd ? endTime - startTime : sourceDuration - startTime;

        String outputExt = targetFormat != null ? targetFormat : extensionOf(source);
        Path output;
        try {
            output = Files.createTempFile("video-", "." + outputExt);
        } catch (IOException e) {
            throw new ToolProcessingException("임시 파일 생성에 실패했습니다: " + e.getMessage(), e);
        }

        List<String> args = new ArrayList<>();
        if (hasStart) {
            args.add("-ss");
            args.add(String.valueOf(startTime));
        }
        args.add("-i");
        args.add(source.toAbsolutePath().toString());
        if (hasEnd) {
            args.add("-t");
            args.add(String.valueOf(clipDuration));
        }
        if (needsReencode) {
            if (resolution != null) {
                args.add("-vf");
                args.add("scale=" + resolution.replace("x", ":"));
            }
            // 컨테이너별로 담을 수 있는 코덱이 다르다 — webm은 h264/aac를 담지 못한다(vp8/vp9/av1 + opus/vorbis만 허용).
            boolean webm = "webm".equalsIgnoreCase(outputExt);
            args.add("-c:v");
            args.add(webm ? "libvpx-vp9" : "libx264");
            if (bitrateKbps != null) {
                args.add("-b:v");
                args.add(bitrateKbps + "k");
            }
            args.add("-c:a");
            args.add(webm ? "libopus" : "aac");
        } else {
            // 트리밍만 요청되고 포맷/해상도/비트레이트 변경이 없을 때만 재인코딩 없이 빠르게 자른다
            // (키프레임 단위로만 잘려 경계가 프레임 정확하지 않을 수 있음 — 037 AC).
            args.add("-c");
            args.add("copy");
        }
        args.add(output.toAbsolutePath().toString());

        ffmpeg.run(args, clipDuration, input.progressReporter());
        return ToolResult.ofFile(output);
    }

    private String extensionOf(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot + 1) : "mp4";
    }
}
