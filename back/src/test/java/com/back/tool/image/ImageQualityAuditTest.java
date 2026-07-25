package com.back.tool.image;

import com.back.support.FfmpegQualityMetrics;
import com.back.support.FfmpegQualityMetrics.QualityMetrics;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 이슈 110 — 이미지 리사이즈/포맷 변환의 화질을 실제 고해상도 사진 샘플로 정량 측정한다.
 * 합성(testsrc 등) 이미지 대신 실사진(Wikimedia Commons CC-BY-SA, "Landscape Arch Utah",
 * 2400x1314로 축소)을 쓴다 — 평탄한 합성 패턴은 비현실적으로 잘 압축되고, 순수 노이즈는
 * 비현실적으로 나쁘게 압축되어 어느 쪽도 "사용자 사진에 일반화되는 결론"의 근거가 못 된다.
 * 측정 방법·전체 결과표는 docs/benchmarks/110-media-quality-audit/README.md 참조.
 */
class ImageQualityAuditTest {

    @TempDir
    Path tempDir;

    private final ImageResizeModule resizeModule = new ImageResizeModule();
    private final ImageFormatModule formatModule = new ImageFormatModule();

    private Path samplePng;
    private Path sampleJpg;

    private Path loadSample(String resourceName) throws IOException {
        Path dest = tempDir.resolve(resourceName);
        try (InputStream in = getClass().getResourceAsStream("/samples/quality-audit/" + resourceName)) {
            assertThat(in).as("샘플 리소스가 존재해야 함: " + resourceName).isNotNull();
            Files.copy(in, dest);
        }
        return dest;
    }

    private Path png() throws IOException {
        if (samplePng == null) samplePng = loadSample("photo-master.png");
        return samplePng;
    }

    private Path jpg() throws IOException {
        if (sampleJpg == null) sampleJpg = loadSample("photo-master.jpg");
        return sampleJpg;
    }

    /**
     * ImageFormatModule의 JPEG 압축 품질 기본값(85)이 실사진에서 SSIM 손실을 거의 남기지
     * 않는지 확인한다 — 같은 해상도(2400x1314)로 png(무손실 원본) vs jpeg(품질85) 직접 비교라
     * 리사이즈 알고리즘과 무관하게 "압축 자체의 손실"만 분리해서 잰다.
     */
    @Test
    void 포맷변환_JPEG_기본품질85는_SSIM_손실이_시각적으로_무시할_수준이다() throws Exception {
        Path source = png();
        ToolResult result = formatModule.process(new ToolInput(
                List.of(source), Map.of("targetFormat", "jpeg")));
        Path output = result.outputFile();

        QualityMetrics metrics = FfmpegQualityMetrics.compare(source, output);
        System.out.printf("[quality-audit][image-format q85] SSIM=%.4f PSNR=%.2fdB size=%dB (원본 %dB)%n",
                metrics.ssim(), metrics.psnrDb(), Files.size(output), Files.size(source));

        // 사진 압축 문헌에서 SSIM ≥ 0.95는 "시각적으로 거의 구분 불가"로 통용되는 하한선.
        assertThat(metrics.ssim()).isGreaterThan(0.95);
    }

    /**
     * 품질 파라미터를 낮춰갈수록(50→100) SSIM이 단조 증가하는지 확인 — 품질 다이얼이
     * 실제로 화질에 영향을 준다는 내부 일관성 점검이자, 트레이드오프 표(파일 크기 vs SSIM)의
     * 원 데이터. 낮은 품질에서 SSIM이 떨어지는 것 자체는 버그가 아니라 JPEG의 본질이다.
     */
    @ParameterizedTest
    @ValueSource(ints = {50, 70, 85, 95, 100})
    void 포맷변환_품질_다이얼별_SSIM_파일크기_트레이드오프를_기록한다(int quality) throws Exception {
        Path source = png();
        long start = System.nanoTime();
        ToolResult result = formatModule.process(new ToolInput(
                List.of(source), Map.of("targetFormat", "jpeg", "quality", String.valueOf(quality))));
        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        Path output = result.outputFile();

        QualityMetrics metrics = FfmpegQualityMetrics.compare(source, output);
        System.out.printf("[quality-audit][image-format q%d] SSIM=%.4f PSNR=%.2fdB size=%dB time=%dms%n",
                quality, metrics.ssim(), metrics.psnrDb(), Files.size(output), elapsedMs);

        // 순수 기록용으로 끝내지 않는다 — 품질 다이얼이 실제로 화질에 반영되는지, 각 값마다
        // 실측(2026-07-25, 이 실사진 샘플 기준)보다 크게 못 미치지 않는지 회귀 확인한다.
        assertThat(metrics.ssim()).isGreaterThan(minSsimFor(quality));
    }

    /** 실측치(README 1-1절)에서 약간의 여유를 둔 하한 — 품질 다이얼이 무력화되면(예: quality 파라미터 무시) 걸린다. */
    private double minSsimFor(int quality) {
        return switch (quality) {
            case 50 -> 0.90;
            case 70 -> 0.94;
            case 85 -> 0.96;
            case 95 -> 0.99;
            default -> 0.995; // 100
        };
    }

    /**
     * ImageResizeModule의 다운스케일 알고리즘(Thumbnailator 기본 리사이저)을 ffmpeg
     * lanczos 참조 스케일러와 같은 해상도로 직접 비교한다 — 둘 다 PNG(무손실)라 JPEG
     * 압축 손실이 섞이지 않고 "리사이즈 알고리즘 자체의 품질"만 분리해서 측정된다.
     */
    @Test
    void 리사이즈_다운스케일_알고리즘이_ffmpeg_lanczos_참조와_비교해_손실이_크지_않다() throws Exception {
        Path source = png();
        int targetW = 1200;
        int targetH = 657;

        ToolResult result = resizeModule.process(new ToolInput(
                List.of(source), Map.of("width", String.valueOf(targetW), "height", String.valueOf(targetH))));
        Path ours = result.outputFile();

        Path reference = tempDir.resolve("lanczos-reference.png");
        runFfmpegScale(source, reference, targetW, targetH);

        QualityMetrics metrics = FfmpegQualityMetrics.compare(reference, ours);
        System.out.printf("[quality-audit][image-resize algorithm] Thumbnailator vs lanczos SSIM=%.4f PSNR=%.2fdB%n",
                metrics.ssim(), metrics.psnrDb());

        assertThat(metrics.ssim()).isGreaterThan(0.90);
    }

    /**
     * "리사이즈 후 JPEG 저장"이라는 실제 사용자 경로 전체(리사이즈 알고리즘 + 품질85 압축)를
     * 원본 해상도로 되돌려(ffmpeg lanczos 업스케일) 지각 손실을 측정한다 — 사용자가 "축소된
     * 결과물이 원본 대비 얼마나 달라 보이는가"를 체감하는 값에 가장 가깝다.
     *
     * 절대 SSIM 임계값을 쓰지 않는다: 다운스케일→업스케일 왕복 자체가 (인코더와 무관하게)
     * 고주파 디테일을 되돌릴 수 없이 잃는 연산이라, 무손실 PNG만으로 같은 왕복을 해도
     * SSIM이 크게 떨어진다(아래 "무손실 lanczos 기준선" 참고 — 실측 0.82). 그래서 이 테스트는
     * 우리 파이프라인(리사이즈+JPEG85)을 "무손실 lanczos 왕복"이라는 이상적 기준선과
     * 비교해, 그 기준선보다 눈에 띄게(0.05 이상) 나쁘지 않은지만 확인한다 — 그래야
     * "왕복 측정법의 구조적 한계"와 "우리 인코딩 파라미터의 실제 문제"를 구분할 수 있다.
     */
    @Test
    void 리사이즈_JPEG_전체파이프라인이_무손실_lanczos_왕복_기준선과_비교해_눈에띄게_나쁘지_않다() throws Exception {
        Path source = jpg();
        int targetW = 1200;
        int targetH = 657;

        ToolResult result = resizeModule.process(new ToolInput(
                List.of(source), Map.of("width", String.valueOf(targetW), "height", String.valueOf(targetH))));
        Path resized = result.outputFile();

        Path upscaledBack = tempDir.resolve("upscaled-back.png");
        runFfmpegScale(resized, upscaledBack, 2400, 1314);
        QualityMetrics ours = FfmpegQualityMetrics.compare(source, upscaledBack);

        // 기준선: 같은 소스를 무손실(PNG) lanczos로만 다운스케일→업스케일 — JPEG도, Thumbnailator도 안 낀
        // "이론적으로 리사이즈 왕복이 도달 가능한 상한".
        Path pngSource = png();
        Path lanczosDown = tempDir.resolve("lanczos-down.png");
        Path lanczosRoundTrip = tempDir.resolve("lanczos-roundtrip.png");
        runFfmpegScale(pngSource, lanczosDown, targetW, targetH);
        runFfmpegScale(lanczosDown, lanczosRoundTrip, 2400, 1314);
        QualityMetrics baseline = FfmpegQualityMetrics.compare(pngSource, lanczosRoundTrip);

        System.out.printf(
                "[quality-audit][image-resize full-pipeline] 우리 SSIM=%.4f PSNR=%.2fdB, 무손실 lanczos 기준선 SSIM=%.4f PSNR=%.2fdB%n",
                ours.ssim(), ours.psnrDb(), baseline.ssim(), baseline.psnrDb());

        assertThat(ours.ssim()).isGreaterThan(baseline.ssim() - 0.05);
    }

    private void runFfmpegScale(Path input, Path output, int width, int height) throws Exception {
        Process process = new ProcessBuilder(
                "ffmpeg", "-y", "-v", "error",
                "-i", input.toAbsolutePath().toString(),
                "-vf", "scale=" + width + ":" + height + ":flags=lanczos",
                output.toAbsolutePath().toString())
                .redirectErrorStream(true)
                .start();
        String out = new String(process.getInputStream().readAllBytes());
        int exit = process.waitFor();
        if (exit != 0) throw new IllegalStateException("ffmpeg scale 실패: " + out);
    }
}
