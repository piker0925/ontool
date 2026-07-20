package com.back.tool.video;

import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * 여러 영상 클립을 순서대로 하나로 합친다(037). pdf-merge와 동일하게 모든 파일이 단일 job이다.
 * 코덱·해상도·픽셀 포맷이 전부 같으면 concat demuxer(-c copy)로 재인코딩 없이 빠르게 합치고,
 * 하나라도 다르면 concat 필터로 첫 클립 해상도에 맞춰 재인코딩한다(037 "재인코딩 필요 여부" 결론).
 */
@Component
@RequiredArgsConstructor
public class VideoMergeModule implements ToolModule {

    private final FfmpegSupport ffmpeg;
    private final FfprobeSupport ffprobe;

    @Override
    public String getId() { return "video-merge"; }

    @Override
    public String getName() { return "영상 병합"; }

    @Override
    public String getCategory() { return "video"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public boolean acceptsMultipleFiles() { return true; }

    @Override
    public Lane getLane() { return Lane.VIDEO; }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        List<Path> sources = input.files();
        if (sources.size() < 2) {
            throw new ToolProcessingException("병합하려면 영상이 2개 이상 필요합니다.");
        }

        List<JsonNode> probes = sources.stream().map(ffprobe::probe).toList();
        double totalDuration = probes.stream().mapToDouble(ffprobe::durationSeconds).sum();

        Path output;
        try {
            output = Files.createTempFile("video-merge-", ".mp4");
        } catch (IOException e) {
            throw new ToolProcessingException("임시 파일 생성에 실패했습니다: " + e.getMessage(), e);
        }

        if (isUniform(probes)) {
            concatCopy(sources, output, totalDuration, input.progressReporter());
        } else {
            concatFilter(sources, probes, output, totalDuration, input.progressReporter());
        }
        return ToolResult.ofFile(output);
    }

    /**
     * concat demuxer(-c copy)는 스트림을 그대로 이어붙이므로, 코덱·해상도·픽셀 포맷뿐 아니라
     * 픽셀 종횡비(SAR)·프레임레이트까지 같아야 한다 — 하나라도 다르면 재생이 찌그러지거나
     * 어긋나는데도 ffmpeg가 에러 없이 통과시킬 수 있어(직접 확인한 concat demuxer 요구사항),
     * 여기서 미리 걸러 재인코딩 경로로 보낸다.
     */
    boolean isUniform(List<JsonNode> probes) {
        JsonNode first = videoStream(probes.get(0));
        if (first == null) return false;
        String codec = first.path("codec_name").asText();
        int width = first.path("width").asInt();
        int height = first.path("height").asInt();
        String pixFmt = first.path("pix_fmt").asText();
        String sar = first.path("sample_aspect_ratio").asText("1:1");
        String frameRate = first.path("r_frame_rate").asText();
        for (JsonNode probe : probes) {
            JsonNode v = videoStream(probe);
            if (v == null) return false;
            if (!codec.equals(v.path("codec_name").asText())
                    || width != v.path("width").asInt()
                    || height != v.path("height").asInt()
                    || !pixFmt.equals(v.path("pix_fmt").asText())
                    || !sar.equals(v.path("sample_aspect_ratio").asText("1:1"))
                    || !frameRate.equals(v.path("r_frame_rate").asText())) {
                return false;
            }
        }
        return true;
    }

    private void concatCopy(List<Path> sources, Path output, double totalDuration,
                             com.back.tool.model.ProgressReporter progressReporter) {
        Path listFile;
        try {
            listFile = Files.createTempFile("video-merge-list-", ".txt");
            StringBuilder content = new StringBuilder();
            for (Path source : sources) {
                content.append("file '").append(source.toAbsolutePath()).append("'\n");
            }
            Files.writeString(listFile, content.toString(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ToolProcessingException("병합 목록 파일 생성에 실패했습니다: " + e.getMessage(), e);
        }
        try {
            List<String> args = List.of(
                    "-f", "concat", "-safe", "0", "-i", listFile.toAbsolutePath().toString(),
                    "-c", "copy", output.toAbsolutePath().toString());
            ffmpeg.run(args, totalDuration, progressReporter);
        } finally {
            try {
                Files.deleteIfExists(listFile);
            } catch (IOException ignored) {
                // 삭제 실패는 무시 — OS가 언젠가 임시 디렉토리를 정리한다
            }
        }
    }

    private void concatFilter(List<Path> sources, List<JsonNode> probes, Path output, double totalDuration,
                               com.back.tool.model.ProgressReporter progressReporter) {
        JsonNode firstVideo = videoStream(probes.get(0));
        int targetWidth = firstVideo.path("width").asInt();
        int targetHeight = firstVideo.path("height").asInt();

        List<String> args = new ArrayList<>();
        List<Integer> videoInputIndex = new ArrayList<>();
        List<Integer> audioInputIndex = new ArrayList<>();
        int nextInput = 0;
        for (int i = 0; i < sources.size(); i++) {
            args.add("-i");
            args.add(sources.get(i).toAbsolutePath().toString());
            videoInputIndex.add(nextInput);
            boolean hasAudio = audioStream(probes.get(i)) != null;
            if (hasAudio) {
                audioInputIndex.add(nextInput);
                nextInput++;
            } else {
                nextInput++;
                // 오디오 없는 클립은 무음 트랙을 합성해 concat 필터의 스트림 수를 맞춘다.
                double clipDuration = ffprobe.durationSeconds(probes.get(i));
                args.add("-f");
                args.add("lavfi");
                args.add("-t");
                args.add(String.valueOf(clipDuration));
                args.add("-i");
                args.add("anullsrc=r=48000:cl=stereo");
                audioInputIndex.add(nextInput);
                nextInput++;
            }
        }

        StringBuilder filter = new StringBuilder();
        StringBuilder concatInputs = new StringBuilder();
        for (int i = 0; i < sources.size(); i++) {
            filter.append("[").append(videoInputIndex.get(i)).append(":v]")
                    .append("scale=").append(targetWidth).append(":").append(targetHeight)
                    .append(":force_original_aspect_ratio=decrease,pad=").append(targetWidth).append(":").append(targetHeight)
                    .append(":(ow-iw)/2:(oh-ih)/2,setsar=1[v").append(i).append("];");
            filter.append("[").append(audioInputIndex.get(i)).append(":a]")
                    .append("aformat=sample_rates=48000:channel_layouts=stereo[a").append(i).append("];");
            concatInputs.append("[v").append(i).append("][a").append(i).append("]");
        }
        filter.append(concatInputs).append("concat=n=").append(sources.size()).append(":v=1:a=1[vout][aout]");

        args.add("-filter_complex");
        args.add(filter.toString());
        args.add("-map");
        args.add("[vout]");
        args.add("-map");
        args.add("[aout]");
        args.add("-c:v");
        args.add("libx264");
        args.add("-c:a");
        args.add("aac");
        args.add(output.toAbsolutePath().toString());

        ffmpeg.run(args, totalDuration, progressReporter);
    }

    private JsonNode videoStream(JsonNode probe) {
        return streamOfType(probe, "video");
    }

    private JsonNode audioStream(JsonNode probe) {
        return streamOfType(probe, "audio");
    }

    private JsonNode streamOfType(JsonNode probe, String codecType) {
        for (JsonNode stream : probe.path("streams")) {
            if (codecType.equals(stream.path("codec_type").asText())) {
                return stream;
            }
        }
        return null;
    }
}
