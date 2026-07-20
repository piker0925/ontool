package com.back.tool.video;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 영상 메타데이터(해상도·코덱·길이·비트레이트·프레임레이트·크기) 조회. 인코딩이 없어 가볍다.
 * FFprobe만 쓰므로 VIDEO 레인(동시 1)을 점유할 이유가 없어 기본 레인(HEAVY)을 그대로 쓴다 — Light로는
 * 못 만든다(Light 모듈은 파일 업로드 경로가 없음, 037 재검토로 확정).
 */
@Component
@RequiredArgsConstructor
public class VideoMetadataModule implements ToolModule {

    private final FfprobeSupport ffprobe;

    @Override
    public String getId() { return "video-metadata"; }

    @Override
    public String getName() { return "영상 메타데이터"; }

    @Override
    public String getCategory() { return "video"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        Path file = input.files().get(0);

        JsonNode root = ffprobe.probe(file);
        JsonNode format = root.path("format");
        JsonNode videoStream = firstStreamOfType(root, "video");
        JsonNode audioStream = firstStreamOfType(root, "audio");

        List<Map<String, String>> items = new ArrayList<>();
        items.add(entry("컨테이너 포맷", format.path("format_long_name").asText("알 수 없음")));
        items.add(entry("길이(초)", format.path("duration").asDouble(0) > 0
                ? String.format("%.2f", format.path("duration").asDouble()) : "알 수 없음"));
        if (videoStream != null) {
            items.add(entry("해상도", videoStream.path("width").asInt() + "x" + videoStream.path("height").asInt()));
            items.add(entry("비디오 코덱", videoStream.path("codec_name").asText("알 수 없음")));
            items.add(entry("프레임레이트(fps)", formatFraction(videoStream.path("avg_frame_rate").asText("0/1"))));
        }
        items.add(entry("전체 비트레이트(bps)", format.path("bit_rate").asText("알 수 없음")));
        if (audioStream != null) {
            items.add(entry("오디오 코덱", audioStream.path("codec_name").asText("알 수 없음")));
        } else {
            items.add(entry("오디오 코덱", "없음"));
        }
        items.add(entry("파일 크기(bytes)", String.valueOf(fileSize(file))));

        return ToolResult.ofKeyValue(items);
    }

    private JsonNode firstStreamOfType(JsonNode root, String codecType) {
        for (JsonNode stream : root.path("streams")) {
            if (codecType.equals(stream.path("codec_type").asText())) {
                return stream;
            }
        }
        return null;
    }

    private String formatFraction(String fraction) {
        String[] parts = fraction.split("/");
        if (parts.length != 2) return fraction;
        double numerator = Double.parseDouble(parts[0]);
        double denominator = Double.parseDouble(parts[1]);
        if (denominator == 0) return "알 수 없음";
        return String.format("%.2f", numerator / denominator);
    }

    private long fileSize(Path file) {
        try {
            return Files.size(file);
        } catch (IOException e) {
            return -1;
        }
    }

    private Map<String, String> entry(String key, String value) {
        return Map.of("key", key, "value", value);
    }
}
