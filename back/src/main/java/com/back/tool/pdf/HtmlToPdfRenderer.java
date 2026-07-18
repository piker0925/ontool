package com.back.tool.pdf;

import com.back.tool.model.ToolProcessingException;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

/**
 * openhtmltopdf 기반 HTML → PDF 렌더링 공용 유틸.
 * PDF를 생성하는 {@code tool/pdf/} 모듈(예: {@link MarkdownToPdfModule})들이
 * Pretendard 한글 폰트 등록과 용지 크기 검증을 각자 중복하지 않고 이 클래스를 통해 재사용한다.
 */
public final class HtmlToPdfRenderer {

    public static final String FONT_FAMILY = "Pretendard";
    private static final Set<String> PAPER_SIZES = Set.of("A4", "LETTER", "A5");

    private HtmlToPdfRenderer() {
    }

    /** 완성된 HTML 문자열을 PDF로 렌더링해 임시 파일에 저장하고 그 경로를 반환한다. */
    public static Path renderToTempFile(String html, String tempFilePrefix) throws IOException {
        Path output = Files.createTempFile(tempFilePrefix, ".pdf");
        try (OutputStream os = Files.newOutputStream(output)) {
            render(html, os);
        }
        return output;
    }

    /** 완성된 HTML 문자열을 지정한 OutputStream에 PDF로 렌더링한다. Pretendard 폰트가 자동 등록된다. */
    public static void render(String html, OutputStream os) throws IOException {
        PdfRendererBuilder builder = new PdfRendererBuilder();
        builder.useFont(HtmlToPdfRenderer::fontStream, FONT_FAMILY);
        builder.withHtmlContent(html, null);
        builder.toStream(os);
        builder.run();
    }

    /** {@code @page{size:...;margin:...}} CSS 규칙을 만든다. paperSize는 {@link #resolvePaperSize}로 검증한다. */
    public static String pageRule(String paperSize, int marginMm) {
        return "@page{size:" + resolvePaperSize(paperSize) + ";margin:" + marginMm + "mm}";
    }

    /** 용지 크기 문자열을 검증하고 정규화한다(A4/LETTER/A5). */
    public static String resolvePaperSize(String paperSize) {
        String normalized = paperSize.trim().toUpperCase();
        if (!PAPER_SIZES.contains(normalized)) {
            throw new ToolProcessingException(
                    "용지 크기는 A4, Letter, A5 중 하나여야 합니다. (입력값: " + paperSize + ")");
        }
        return normalized;
    }

    private static InputStream fontStream() {
        try {
            return new ClassPathResource("fonts/Pretendard-Regular.ttf").getInputStream();
        } catch (IOException e) {
            throw new ToolProcessingException("한글 폰트 로드 실패: " + e.getMessage(), e);
        }
    }
}
