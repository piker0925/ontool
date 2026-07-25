package com.back.support;

import java.io.IOException;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ffmpeg의 내장 ssim/psnr 필터로 두 이미지(또는 영상)의 화질 차이를 정량 측정한다(이슈 110).
 * 정지 이미지도 ffmpeg 안에서는 1프레임짜리 영상으로 취급되므로 같은 필터로 측정 가능하다.
 * 두 입력은 반드시 같은 해상도여야 한다(다르면 ffmpeg가 필터 그래프 오류로 실패한다).
 */
public final class FfmpegQualityMetrics {

    // 완전 무손실 비교(예: -c copy 트리밍)면 MSE=0이라 ffmpeg가 "inf"를 출력한다.
    private static final Pattern SSIM_ALL = Pattern.compile("All:(inf|[0-9.]+)");
    private static final Pattern PSNR_AVERAGE = Pattern.compile("average:(inf|[0-9.]+)");

    private FfmpegQualityMetrics() {}

    public record QualityMetrics(double ssim, double psnrDb) {}

    public static QualityMetrics compare(Path reference, Path candidate) {
        String stderr = runFfmpeg(reference, candidate, null);
        double ssim = extract(SSIM_ALL, stderr, "SSIM");
        double psnr = extract(PSNR_AVERAGE, stderr, "PSNR");
        return new QualityMetrics(ssim, psnr);
    }

    /**
     * 두 입력의 재생 길이가 다를 때(예: 트리밍 전후 비교) 쓴다 — ffmpeg의 ssim/psnr 필터는
     * 길이가 다른 두 스트림을 그대로 물리면 짧은 쪽 마지막 프레임을 정지시켜 나머지 구간을
     * 채우는데, 그 "정지 프레임 vs 계속 움직이는 원본"이 비교돼 실제로는 무손실인 구간도
     * SSIM이 크게 낮게 나온다. maxDurationSeconds로 두 입력 모두 같은 길이로 잘라 비교하면
     * 이 왜곡을 없앨 수 있다.
     */
    public static QualityMetrics compare(Path reference, Path candidate, double maxDurationSeconds) {
        String stderr = runFfmpeg(reference, candidate, maxDurationSeconds);
        double ssim = extract(SSIM_ALL, stderr, "SSIM");
        double psnr = extract(PSNR_AVERAGE, stderr, "PSNR");
        return new QualityMetrics(ssim, psnr);
    }

    private static String runFfmpeg(Path reference, Path candidate, Double maxDurationSeconds) {
        // named pad(트림 결과)는 한 번만 소비할 수 있어 split으로 각각 ssim/psnr용으로 복제한다.
        String filter = maxDurationSeconds == null
                ? "[0:v][1:v]ssim;[0:v][1:v]psnr"
                : "[0:v]trim=duration=" + maxDurationSeconds + ",split=2[r1][r2];"
                        + "[1:v]trim=duration=" + maxDurationSeconds + ",split=2[c1][c2];"
                        + "[r1][c1]ssim;[r2][c2]psnr";
        try {
            Process process = new ProcessBuilder(
                    "ffmpeg", "-v", "info",
                    "-i", reference.toAbsolutePath().toString(),
                    "-i", candidate.toAbsolutePath().toString(),
                    "-lavfi", filter,
                    "-f", "null", "-")
                    .redirectErrorStream(true)
                    .start();
            String output = new String(process.getInputStream().readAllBytes());
            if (!process.waitFor(60, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IllegalStateException("ffmpeg SSIM/PSNR 계산이 시간 내 끝나지 않았습니다");
            }
            return output;
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException("ffmpeg SSIM/PSNR 계산 실패(로컬에 ffmpeg 필요): " + e.getMessage(), e);
        }
    }

    private static double extract(Pattern pattern, String stderr, String label) {
        Matcher matcher = pattern.matcher(stderr);
        Double last = null;
        while (matcher.find()) {
            String value = matcher.group(1);
            last = value.equals("inf") ? Double.POSITIVE_INFINITY : Double.parseDouble(value);
        }
        if (last == null) {
            throw new IllegalStateException(label + " 값을 ffmpeg 출력에서 찾지 못했습니다:\n" + stderr);
        }
        return last;
    }
}
