package com.back.tool.video;

import com.back.tool.model.ToolProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;

/** ffprobe로 영상 파일의 길이·해상도·코덱 등을 조회하는 공용 래퍼(037). 인코딩은 하지 않아 가볍다. */
@Component
public class FfprobeSupport {

    // ffprobe는 인코딩 없이 헤더만 읽어 원래 빠르다 — 이 안에 못 끝나면 입력이 비정상이라고 본다.
    private static final long TIMEOUT_SECONDS = 60;

    private final String binaryPath;
    private final ObjectMapper mapper = new ObjectMapper();

    public FfprobeSupport(@Value("${ffmpeg.ffprobe-path:ffprobe}") String binaryPath) {
        this.binaryPath = binaryPath;
    }

    /** {@code -show_format -show_streams}의 JSON 결과를 그대로 반환한다. */
    public JsonNode probe(Path file) {
        List<String> command = List.of(binaryPath, "-v", "error", "-print_format", "json",
                "-show_format", "-show_streams", file.toAbsolutePath().toString());

        Process process;
        try {
            process = new ProcessBuilder(command).start();
        } catch (IOException e) {
            throw new ToolProcessingException("FFprobe 실행에 실패했습니다: " + e.getMessage(), e);
        }

        // stdout·stderr을 동시에 별도 스레드로 비워야 한다 — 순차로 읽으면 한쪽 파이프 버퍼가 차서
        // 프로세스가 멈추고, 그 쪽을 다 읽을 때까지 다른 쪽을 시작도 못 해 데드락에 빠질 수 있다.
        StringBuilder stdout = new StringBuilder();
        StringBuilder stderr = new StringBuilder();
        Thread stdoutDrain = new Thread(() -> drain(process.getInputStream(), stdout), "ffprobe-stdout-drain");
        Thread stderrDrain = new Thread(() -> drain(process.getErrorStream(), stderr), "ffprobe-stderr-drain");
        stdoutDrain.setDaemon(true);
        stderrDrain.setDaemon(true);
        stdoutDrain.start();
        stderrDrain.start();

        boolean exited;
        int exitCode;
        try {
            exited = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            stdoutDrain.join(TimeUnit.SECONDS.toMillis(5));
            stderrDrain.join(TimeUnit.SECONDS.toMillis(5));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ToolProcessingException("FFprobe 실행이 중단되었습니다.");
        }
        if (!exited) {
            process.destroyForcibly();
            throw new ToolProcessingException("FFprobe 실행이 " + TIMEOUT_SECONDS + "초를 넘어 중단했습니다.");
        }
        exitCode = process.exitValue();
        if (exitCode != 0) {
            throw new ToolProcessingException("영상 파일을 분석할 수 없습니다: " + stderr.toString().strip());
        }

        try {
            return mapper.readTree(stdout.toString());
        } catch (IOException e) {
            throw new ToolProcessingException("FFprobe 결과 파싱에 실패했습니다: " + e.getMessage(), e);
        }
    }

    private void drain(java.io.InputStream stream, StringBuilder into) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                into.append(line).append('\n');
            }
        } catch (IOException e) {
            // 프로세스 종료 시 스트림이 끊기는 정상 케이스 — 무시
        }
    }

    /** 컨테이너(format) 길이 우선, 없으면 첫 스트림 길이로 대체한다. */
    public double durationSeconds(Path file) {
        return durationSeconds(probe(file));
    }

    /**
     * 이미 {@link #probe}로 가져온 결과가 있을 때 재사용하는 오버로드 — 같은 파일을 두 번 probe하지
     * 않아도 되게 한다(호출부가 스트림 목록도 함께 봐야 하는 경우, 예: 오디오 트랙 존재 여부 확인).
     */
    public double durationSeconds(JsonNode root) {
        double formatDuration = root.path("format").path("duration").asDouble(-1);
        if (formatDuration > 0) return formatDuration;
        for (JsonNode stream : root.path("streams")) {
            double streamDuration = stream.path("duration").asDouble(-1);
            if (streamDuration > 0) return streamDuration;
        }
        throw new ToolProcessingException("영상 길이를 확인할 수 없습니다.");
    }
}
