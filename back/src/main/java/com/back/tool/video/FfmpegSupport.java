package com.back.tool.video;

import com.back.tool.model.ProgressReporter;
import com.back.tool.model.ToolProcessingException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * FFmpeg를 {@link ProcessBuilder}로 직접 호출하는 공용 래퍼(037 — 순수 JVM 대안은 유지보수 끊김 문제로 배제).
 * 입출력 경로를 그대로 커맨드 인자로 넘기므로 대용량 파일도 메모리에 올리지 않는다(036 스트리밍 규약).
 */
@Slf4j
@Component
public class FfmpegSupport {

    /** stderr 로그를 무한정 들고 있지 않도록 에러 메시지에 포함할 최근 분량 상한(문자). */
    private static final int STDERR_TAIL_CHARS = 2000;

    // VIDEO 레인은 permit=1(ADR-0019)이라 하나가 무한정 멈추면 큐 전체가 막힌다 — 방어적 상한.
    private static final long TIMEOUT_MINUTES = 30;

    private final String binaryPath;

    public FfmpegSupport(@Value("${ffmpeg.binary-path:ffmpeg}") String binaryPath) {
        this.binaryPath = binaryPath;
    }

    /**
     * ffmpeg를 실행한다. {@code args}는 "-y" 등 공통 플래그를 제외한 입출력·필터 인자만 넘기면 된다
     * (이 메서드가 진행률 파싱에 필요한 "-progress pipe:1"을 자동으로 붙인다).
     * durationSeconds가 0보다 크면 stdout의 진행률 라인을 durationSeconds 대비 백분율로 환산해
     * progressReporter로 보고한다(037 — ADR-0019 진행률 배관).
     */
    public void run(List<String> args, double durationSeconds, ProgressReporter progressReporter) {
        List<String> command = new ArrayList<>();
        command.add(binaryPath);
        command.add("-y");
        command.add("-nostats");
        command.add("-progress");
        command.add("pipe:1");
        command.addAll(args);

        Process process;
        try {
            process = new ProcessBuilder(command).start();
        } catch (IOException e) {
            throw new ToolProcessingException("FFmpeg 실행에 실패했습니다: " + e.getMessage(), e);
        }

        StringBuilder stderrTail = new StringBuilder();
        Thread stderrDrain = new Thread(() -> drainStderr(process, stderrTail), "ffmpeg-stderr-drain");
        stderrDrain.setDaemon(true);
        stderrDrain.start();

        // 워치독: 시간 내 못 끝나면 강제 종료한다 — 그러면 stdout이 닫혀 아래 readLine() 루프가 풀려나온다.
        Thread watchdog = new Thread(() -> {
            try {
                if (!process.waitFor(TIMEOUT_MINUTES, TimeUnit.MINUTES) && process.isAlive()) {
                    process.destroyForcibly();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "ffmpeg-watchdog");
        watchdog.setDaemon(true);
        watchdog.start();

        try (BufferedReader out = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = out.readLine()) != null) {
                if (durationSeconds > 0 && line.startsWith("out_time_ms=")) {
                    reportProgress(line, durationSeconds, progressReporter);
                }
            }
        } catch (IOException e) {
            throw new ToolProcessingException("FFmpeg 출력을 읽는 중 실패했습니다: " + e.getMessage(), e);
        }

        int exitCode;
        try {
            exitCode = process.waitFor();
            stderrDrain.join(TimeUnit.SECONDS.toMillis(5));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ToolProcessingException("FFmpeg 실행이 중단되었습니다.");
        }

        if (exitCode != 0) {
            throw new ToolProcessingException(
                    "FFmpeg 처리에 실패했습니다(종료 코드 " + exitCode + "): " + tail(stderrTail));
        }
    }

    // ffmpeg -progress의 out_time_ms는 이름과 달리 마이크로초 단위(ffmpeg 자체의 알려진 표기 관행).
    private void reportProgress(String line, double durationSeconds, ProgressReporter progressReporter) {
        String value = line.substring("out_time_ms=".length()).trim();
        long micros;
        try {
            micros = Long.parseLong(value);
        } catch (NumberFormatException e) {
            return; // "N/A" 등 — 이번 tick은 건너뛰고 다음 라인 대기
        }
        if (micros < 0) return;
        double elapsedSeconds = micros / 1_000_000.0;
        int percent = (int) Math.min(99, Math.max(0, (elapsedSeconds / durationSeconds) * 100));
        progressReporter.report(percent);
    }

    private void drainStderr(Process process, StringBuilder tail) {
        try (BufferedReader err = new BufferedReader(
                new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = err.readLine()) != null) {
                tail.append(line).append('\n');
            }
        } catch (IOException e) {
            log.debug("FFmpeg stderr 읽기 종료: {}", e.getMessage());
        }
    }

    private String tail(StringBuilder full) {
        String s = full.toString().strip();
        return s.length() > STDERR_TAIL_CHARS ? s.substring(s.length() - STDERR_TAIL_CHARS) : s;
    }
}
