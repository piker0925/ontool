package com.back.tool.video;

import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.back.tool.pdf.WatermarkPosition;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.geom.Point2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * 이미지·텍스트 워터마크를 영상에 오버레이한다(037). {@code PdfWatermarkModule}과 같은 계약 —
 * files[0]=대상 영상, files[1]=워터마크 이미지(선택). 좌표 계산은 {@link WatermarkPosition}을
 * 그대로 재사용해 PDF/이미지 워터마크와 동일한 배치 로직을 쓴다.
 */
@Component
@RequiredArgsConstructor
public class VideoWatermarkModule implements ToolModule {

    private static final double MARGIN = 20;

    private final FfmpegSupport ffmpeg;
    private final FfprobeSupport ffprobe;

    @Override
    public String getId() { return "video-watermark"; }

    @Override
    public String getName() { return "영상 워터마크"; }

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
        if (input.files().isEmpty() || input.files().size() > 2) {
            throw new ToolProcessingException(
                    "워터마크는 대상 영상 1개와 워터마크 이미지 1개(선택)만 지원합니다. (입력 파일 수: "
                            + input.files().size() + ")");
        }
        Path target = input.files().get(0);
        Path watermarkImage = input.files().size() == 2 ? input.files().get(1) : null;

        ToolParams params = ToolParams.of(input);
        String text = params.getString("text", "");
        if (text.isBlank() && watermarkImage == null) {
            throw new ToolProcessingException("텍스트 워터마크 또는 워터마크 이미지 중 하나는 필요합니다.");
        }
        WatermarkPosition position = params.getEnum("position", WatermarkPosition.class, WatermarkPosition.CENTER);
        int opacityPercent = params.getInt("opacity", 30, 0, 100);
        double opacity = opacityPercent / 100.0;

        JsonNode probe = ffprobe.probe(target);
        double duration = ffprobe.durationSeconds(probe);
        JsonNode videoStream = videoStream(probe);
        if (videoStream == null) {
            throw new ToolProcessingException("영상 스트림을 찾을 수 없습니다.");
        }
        int videoWidth = videoStream.path("width").asInt();
        int videoHeight = videoStream.path("height").asInt();

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(target.toAbsolutePath().toString());

        Path output;
        try {
            output = Files.createTempFile("video-watermark-", ".mp4");
        } catch (IOException e) {
            throw new ToolProcessingException("임시 파일 생성에 실패했습니다: " + e.getMessage(), e);
        }

        String videoLabel = "0:v";
        StringBuilder filter = new StringBuilder();
        Path textFile = null;
        try {
            if (watermarkImage != null) {
                args.add("-i");
                args.add(watermarkImage.toAbsolutePath().toString());
                Point2D.Double offset = imageOffset(watermarkImage, position, videoWidth, videoHeight);
                filter.append("[1:v]format=rgba,colorchannelmixer=aa=").append(opacity).append("[wm];")
                        .append("[").append(videoLabel).append("][wm]overlay=")
                        .append((int) offset.x).append(":").append((int) offset.y).append("[vwm];");
                videoLabel = "vwm";
            }

            if (!text.isBlank()) {
                // text= 옵션에 임의 문자열을 인라인으로 넣으면 필터 그래프 파서·옵션 파서 2중 이스케이프
                // 규칙이 겹쳐 특수문자(콜론·작은따옴표 등) 조합에서 깨지기 쉽다(직접 재현 확인). ffmpeg
                // 공식 문서가 권장하는 대로 textfile=로 파일 내용을 그대로 읽혀 이스케이프 문제를 피한다.
                try {
                    textFile = Files.createTempFile("video-watermark-text-", ".txt");
                    Files.writeString(textFile, text, StandardCharsets.UTF_8);
                } catch (IOException e) {
                    throw new ToolProcessingException("워터마크 텍스트 파일 생성에 실패했습니다: " + e.getMessage(), e);
                }
                String[] xy = textPositionExpr(position);
                filter.append("[").append(videoLabel).append("]drawtext=textfile='")
                        .append(escapePathForFilter(textFile.toAbsolutePath().toString()))
                        .append("':fontcolor=white@").append(opacity)
                        .append(":fontsize=24:box=1:boxcolor=black@").append(opacity * 0.5)
                        .append(":x=").append(xy[0]).append(":y=").append(xy[1]).append("[vout];");
                videoLabel = "vout";
            }

            // 마지막에 붙은 세미콜론 제거 + 최종 출력 라벨을 -map으로 지정. text/이미지 중 하나는 이미
            // 위에서 검증했으므로 filter는 항상 비어 있지 않다.
            String graph = filter.substring(0, filter.length() - 1);
            args.add("-filter_complex");
            args.add(graph);
            args.add("-map");
            args.add("[" + videoLabel + "]");
            args.add("-map");
            args.add("0:a?"); // 오디오 트랙이 있으면 그대로 유지, 없어도 에러 아님(? 옵션 스트림)
            args.add("-c:v");
            args.add("libx264");
            args.add("-c:a");
            args.add("aac");
            args.add(output.toAbsolutePath().toString());

            ffmpeg.run(args, duration, input.progressReporter());
            return ToolResult.ofFile(output);
        } finally {
            if (textFile != null) {
                try {
                    Files.deleteIfExists(textFile);
                } catch (IOException ignored) {
                    // 삭제 실패는 무시 — OS가 언젠가 임시 디렉토리를 정리한다
                }
            }
        }
    }

    private Point2D.Double imageOffset(Path watermarkImage, WatermarkPosition position, int videoWidth, int videoHeight) {
        BufferedImage wm;
        try {
            wm = ImageIO.read(watermarkImage.toFile());
        } catch (IOException e) {
            throw new ToolProcessingException("워터마크 이미지를 읽을 수 없습니다: " + e.getMessage(), e);
        }
        if (wm == null) {
            throw new ToolProcessingException("워터마크 이미지를 읽을 수 없습니다.");
        }
        return position.offset(videoWidth, videoHeight, wm.getWidth(), wm.getHeight(), MARGIN);
    }

    private String[] textPositionExpr(WatermarkPosition position) {
        String margin = String.valueOf((int) MARGIN);
        return switch (position) {
            case TOP_LEFT -> new String[]{margin, margin};
            case TOP_RIGHT -> new String[]{"main_w-text_w-" + margin, margin};
            case BOTTOM_LEFT -> new String[]{margin, "main_h-text_h-" + margin};
            case BOTTOM_RIGHT -> new String[]{"main_w-text_w-" + margin, "main_h-text_h-" + margin};
            case CENTER -> new String[]{"(main_w-text_w)/2", "(main_h-text_h)/2"};
        };
    }

    /**
     * 필터 옵션 값(작은따옴표로 감싼 경로)에 콜론·백슬래시가 섞이면 필터 그래프 파서가 깨진다.
     * {@code Files.createTempFile}이 만드는 경로엔 보통 등장하지 않지만, OS·로케일에 따라 달라질 수
     * 있어 방어적으로 이스케이프한다.
     */
    String escapePathForFilter(String path) {
        return path.replace("\\", "\\\\").replace(":", "\\:");
    }

    private JsonNode videoStream(JsonNode probe) {
        for (JsonNode stream : probe.path("streams")) {
            if ("video".equals(stream.path("codec_type").asText())) {
                return stream;
            }
        }
        return null;
    }
}
