package com.back.tool.video;

import com.back.support.FfmpegQualityMetrics;
import com.back.support.FfmpegQualityMetrics.QualityMetrics;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 이슈 110 — VideoTrimConvertModule의 재인코딩 화질을 실제 1080p 영상 샘플로 정량 측정한다.
 * 샘플은 Wikimedia Commons "Nature Documentary Reel - 2017"(CC BY-SA, 실촬영 자연 다큐)에서
 * 4초를 잘라 CRF16으로 재인코딩한 마스터 — testsrc 같은 합성 패턴은 지나치게 잘 압축돼
 * 실사용자 영상에 일반화되지 않는다.
 * 측정 방법·전체 결과표는 docs/benchmarks/110-media-quality-audit/README.md 참조.
 */
class VideoQualityAuditTest {

    @TempDir
    Path tempDir;

    private final FfmpegSupport ffmpeg = new FfmpegSupport("ffmpeg");
    private final FfprobeSupport ffprobe = new FfprobeSupport("ffprobe");
    private final VideoTrimConvertModule module = new VideoTrimConvertModule(ffmpeg, ffprobe);

    private Path loadSample() throws IOException {
        Path dest = tempDir.resolve("video-master.mp4");
        try (InputStream in = getClass().getResourceAsStream("/samples/quality-audit/video-master.mp4")) {
            assertThat(in).as("샘플 리소스가 존재해야 함").isNotNull();
            Files.copy(in, dest);
        }
        return dest;
    }

    /**
     * 해상도를 원본과 동일하게 지정해 재인코딩 분기(needsReencode)를 타는 케이스의 실제
     * 화질/비트레이트/인코딩 시간을 측정한다 — VideoTrimConvertModule이 실제로 내보내는
     * -crf/-preset 값(이슈 110 튜닝 이후: 명시적 -crf 23 -preset veryfast) 기준.
     *
     * 튜닝 전(라이브러리 묵시적 기본값 CRF23/preset medium — -crf/-preset을 아예 넘기지
     * 않던 시절의 동작)과 직접 비교하려면 아래 CRF_다이얼별_... 스윕 테스트의 "crf=23
     * preset=medium" 행을 참고할 것 — 그 값이 튜닝 전 이 테스트가 내던 수치와 정확히
     * 일치함을 확인했다(docs/benchmarks/110-media-quality-audit/README.md 2-1절).
     */
    @Test
    void 재인코딩_실제_모듈_설정값CRF23_veryfast의_실측_화질과_처리시간() throws Exception {
        Path source = loadSample();

        long start = System.nanoTime();
        ToolResult result = module.process(new ToolInput(
                List.of(source), Map.of("resolution", "1920x1080")));
        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        Path output = result.outputFile();

        QualityMetrics metrics = FfmpegQualityMetrics.compare(source, output);
        long sourceSize = Files.size(source);
        long outputSize = Files.size(output);
        long outputBitrateKbps = probeBitrateKbps(output);

        System.out.printf(
                "[quality-audit][video-reencode module-actual-settings] SSIM=%.4f PSNR=%.2fdB size=%d->%dB bitrate=%dkbps time=%dms%n",
                metrics.ssim(), metrics.psnrDb(), sourceSize, outputSize, outputBitrateKbps, elapsedMs);

        assertThat(metrics.ssim()).isGreaterThan(0.90);
    }

    /**
     * -c copy 경로(재인코딩 없음, 트리밍만)는 화질 손실이 전혀 없어야 한다 — 재인코딩 케이스와
     * 대조하기 위한 대조군(sanity check).
     */
    @Test
    void 트리밍만_요청하면_c_copy라_화질손실이_없다() throws Exception {
        Path source = loadSample();

        ToolResult result = module.process(new ToolInput(
                List.of(source), Map.of("startTime", "0", "endTime", "2")));
        Path output = result.outputFile();

        // -ss가 키프레임에 스냅되어 결과 길이가 정확히 2.0초가 아닐 수 있다(037) — 실제 산출된
        // 길이보다 살짝 짧게 잘라 비교해야 ssim 필터가 "짧은 쪽 마지막 프레임 정지"로 왜곡되지 않는다.
        double outputDuration = ffprobe.durationSeconds(output);
        QualityMetrics metrics = FfmpegQualityMetrics.compare(source, output, outputDuration - 0.15);
        System.out.printf("[quality-audit][video trim -c copy] SSIM=%.4f PSNR=%.2fdB%n",
                metrics.ssim(), metrics.psnrDb());

        assertThat(metrics.ssim()).isGreaterThan(0.999);
    }

    /**
     * CRF를 명시적으로 바꿔가며(18/20/23/28) SSIM·비트레이트·인코딩 시간의 트레이드오프를
     * 기록한다 — 2 OCPU 오라클 프리티어에서 "화질을 올리면 처리 시간이 얼마나 늘어나는가"를
     * 구체적 수치로 남기기 위한 데이터. FfmpegSupport에 args로 직접 -crf/-preset을 넘겨
     * 실제 모듈이 재인코딩 시 사용하는 것과 동일한 코덱(libx264)·필터 경로를 그대로 탄다.
     */
    @Test
    void CRF_다이얼별_SSIM_비트레이트_인코딩시간_트레이드오프를_기록한다() throws Exception {
        Path source = loadSample();
        for (String preset : new String[]{"medium", "veryfast"}) {
            double previousSsim = Double.POSITIVE_INFINITY;
            for (int crf : new int[]{18, 20, 23, 28}) {
                Path output = tempDir.resolve("crf" + crf + "-" + preset + ".mp4");
                long start = System.nanoTime();
                runExplicitCrf(source, output, crf, preset);
                long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);

                QualityMetrics metrics = FfmpegQualityMetrics.compare(source, output);
                long bitrateKbps = probeBitrateKbps(output);
                System.out.printf(
                        "[quality-audit][video crf=%d preset=%s] SSIM=%.4f PSNR=%.2fdB bitrate=%dkbps size=%dB time=%dms%n",
                        crf, preset, metrics.ssim(), metrics.psnrDb(), bitrateKbps, Files.size(output), elapsedMs);

                // 순수 기록용 테스트로 끝내지 않는다 — CRF가 커질수록(압축이 강해질수록) SSIM이
                // 단조 감소해야 한다는 내부 일관성을 확인한다. 어긋나면 인자가 잘못 전달됐거나
                // ffmpeg 호출 자체가 깨졌다는 신호다.
                assertThat(metrics.ssim()).isLessThan(previousSsim);
                assertThat(bitrateKbps).isGreaterThan(0);
                previousSsim = metrics.ssim();
            }
        }
    }

    private void runExplicitCrf(Path source, Path output, int crf, String preset) throws Exception {
        Process process = new ProcessBuilder(
                "ffmpeg", "-y", "-v", "error",
                "-i", source.toAbsolutePath().toString(),
                "-c:v", "libx264", "-crf", String.valueOf(crf), "-preset", preset,
                "-c:a", "aac",
                output.toAbsolutePath().toString())
                .redirectErrorStream(true)
                .start();
        String out = new String(process.getInputStream().readAllBytes());
        int exit = process.waitFor();
        if (exit != 0) throw new IllegalStateException("ffmpeg 인코딩 실패: " + out);
    }

    private long probeBitrateKbps(Path file) throws Exception {
        Process process = new ProcessBuilder(
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=bit_rate", "-of", "default=noprint_wrappers=1:nokey=1",
                file.toAbsolutePath().toString())
                .redirectErrorStream(true)
                .start();
        String out = new String(process.getInputStream().readAllBytes()).trim();
        process.waitFor();
        try {
            return Long.parseLong(out) / 1000;
        } catch (NumberFormatException e) {
            // 스트림 레벨 bit_rate가 없는 컨테이너면 컨테이너 전체 bit_rate로 대체
            return probeFormatBitrateKbps(file);
        }
    }

    private long probeFormatBitrateKbps(Path file) throws Exception {
        Process process = new ProcessBuilder(
                "ffprobe", "-v", "error",
                "-show_entries", "format=bit_rate", "-of", "default=noprint_wrappers=1:nokey=1",
                file.toAbsolutePath().toString())
                .redirectErrorStream(true)
                .start();
        String out = new String(process.getInputStream().readAllBytes()).trim();
        process.waitFor();
        return Long.parseLong(out) / 1000;
    }
}
