package com.back.tool.video;

import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/** 영상 파일에서 오디오 트랙만 추출(mp3/wav). VIDEO 레인 — 나머지 파이프라인은 1~3번과 동일(037). */
@Component
@RequiredArgsConstructor
public class VideoToAudioModule implements ToolModule {

    private final FfmpegSupport ffmpeg;
    private final FfprobeSupport ffprobe;

    @Override
    public String getId() { return "video-to-audio"; }

    @Override
    public String getName() { return "영상 → 오디오 추출"; }

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

        String format = params.getString("format", "mp3");
        if (!format.equals("mp3") && !format.equals("wav")) {
            throw new ToolProcessingException("format은 mp3 또는 wav여야 합니다. (입력값: " + format + ")");
        }

        JsonNode root = ffprobe.probe(source);
        if (!hasAudioStream(root)) {
            throw new ToolProcessingException("이 영상에는 오디오 트랙이 없습니다.");
        }
        double duration = ffprobe.durationSeconds(root);

        Path output;
        try {
            output = Files.createTempFile("video-audio-", "." + format);
        } catch (IOException e) {
            throw new ToolProcessingException("임시 파일 생성에 실패했습니다: " + e.getMessage(), e);
        }

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(source.toAbsolutePath().toString());
        args.add("-vn"); // 비디오 스트림 제외
        if (format.equals("mp3")) {
            args.add("-c:a");
            args.add("libmp3lame");
            args.add("-q:a");
            args.add("2"); // VBR 고품질(0=최고~9=최저)
        } else {
            args.add("-c:a");
            args.add("pcm_s16le");
        }
        args.add(output.toAbsolutePath().toString());

        ffmpeg.run(args, duration, input.progressReporter());
        return ToolResult.ofFile(output);
    }

    private boolean hasAudioStream(JsonNode root) {
        for (JsonNode stream : root.path("streams")) {
            if ("audio".equals(stream.path("codec_type").asText())) {
                return true;
            }
        }
        return false;
    }
}
