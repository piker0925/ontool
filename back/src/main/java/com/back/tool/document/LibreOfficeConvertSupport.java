package com.back.tool.document;

import com.back.tool.model.ToolProcessingException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

/**
 * LibreOffice headless를 {@link ProcessBuilder}로 호출해 오피스 문서를 PDF로 변환하는 공용 래퍼(094).
 * HWP/HWPX 임포트는 H2Orestart 확장에 의존한다(배포 이미지에 설치 — ADR-0029).
 * 입출력을 경로로만 다루므로 대용량 파일도 메모리에 올리지 않는다(036 스트리밍 규약).
 */
@Slf4j
@Component
public class LibreOfficeConvertSupport {

    /** 출력 로그를 무한정 들고 있지 않도록 에러 메시지에 포함할 최근 분량 상한(문자). */
    private static final int OUTPUT_TAIL_CHARS = 2000;

    // 문서 변환은 보통 수 초 내에 끝난다 — 하나가 멈추면 레인이 막히므로 방어적 상한(ADR-0019와 동일 취지).
    private static final long TIMEOUT_MINUTES = 5;

    private final String binaryPath;

    public LibreOfficeConvertSupport(@Value("${libreoffice.binary-path:soffice}") String binaryPath) {
        this.binaryPath = binaryPath;
    }

    /**
     * 입력 문서를 PDF로 변환해 생성된 PDF 경로를 돌려준다.
     * 인보케이션마다 임시 사용자 프로필({@code -env:UserInstallation})을 격리해
     * LibreOffice의 동시 실행 프로필 락 충돌을 피한다(ADR-0029).
     * LibreOffice는 임포트에 실패해도 종료 코드 0으로 끝나는 일이 있어,
     * 성공 판정은 종료 코드가 아니라 출력 PDF의 실존 여부로 한다.
     */
    public Path convertToPdf(Path input) {
        Path outDir;
        Path profileDir;
        try {
            outDir = Files.createTempDirectory("office-pdf-");
            profileDir = Files.createTempDirectory("lo-profile-");
        } catch (IOException e) {
            throw new ToolProcessingException("임시 디렉토리 생성에 실패했습니다: " + e.getMessage(), e);
        }

        List<String> command = List.of(
                binaryPath,
                "--headless",
                "--norestore",
                "-env:UserInstallation=file://" + profileDir.toAbsolutePath(),
                "--convert-to", "pdf",
                "--outdir", outDir.toAbsolutePath().toString(),
                input.toAbsolutePath().toString());

        StringBuilder outputTail = new StringBuilder();
        try {
            Process process;
            try {
                process = new ProcessBuilder(command).redirectErrorStream(true).start();
            } catch (IOException e) {
                throw new ToolProcessingException("LibreOffice 실행에 실패했습니다: " + e.getMessage(), e);
            }

            try (BufferedReader out = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = out.readLine()) != null) {
                    outputTail.append(line).append('\n');
                }
            } catch (IOException e) {
                throw new ToolProcessingException("LibreOffice 출력을 읽는 중 실패했습니다: " + e.getMessage(), e);
            }

            int exitCode;
            try {
                if (!process.waitFor(TIMEOUT_MINUTES, TimeUnit.MINUTES)) {
                    process.destroyForcibly();
                    throw new ToolProcessingException("문서 변환이 제한 시간(" + TIMEOUT_MINUTES + "분)을 초과했습니다.");
                }
                exitCode = process.exitValue();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ToolProcessingException("문서 변환이 중단되었습니다.");
            }

            Path pdf = outDir.resolve(replaceExtensionWithPdf(input.getFileName().toString()));
            if (exitCode != 0 || !Files.exists(pdf)) {
                throw new ToolProcessingException(
                        "문서를 PDF로 변환하지 못했습니다(종료 코드 " + exitCode + "): " + tail(outputTail));
            }
            return pdf;
        } finally {
            deleteRecursivelyQuietly(profileDir);
        }
    }

    private String replaceExtensionWithPdf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return (dot >= 0 ? fileName.substring(0, dot) : fileName) + ".pdf";
    }

    private String tail(StringBuilder full) {
        String s = full.toString().strip();
        return s.length() > OUTPUT_TAIL_CHARS ? s.substring(s.length() - OUTPUT_TAIL_CHARS) : s;
    }

    private void deleteRecursivelyQuietly(Path dir) {
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                    // 프로필 정리는 최선 노력 — 실패해도 변환 결과에는 영향 없음
                }
            });
        } catch (IOException e) {
            log.debug("LibreOffice 프로필 임시 디렉토리 정리 실패: {}", e.getMessage());
        }
    }
}
