package com.back.tool.pdf;

import com.back.tool.model.ToolProcessingException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.core.io.ClassPathResource;

import java.awt.Font;
import java.awt.FontFormatException;
import java.io.IOException;
import java.io.InputStream;

/**
 * 워터마크·헤더푸터 텍스트 오버레이가 공용으로 쓰는 한글 폰트(Pretendard) 로더.
 * PDFBox 오버레이(PDType0Font)와 AWT Graphics2D 오버레이(java.awt.Font) 양쪽에서 같은 폰트 리소스를 쓴다
 * (MarkdownToPdfModule과 동일한 리소스 — ADR-0013 tool/pdf 패키지 내부 공용 헬퍼).
 */
final class KoreanFontSupport {

    private static final String FONT_RESOURCE = "fonts/Pretendard-Regular.ttf";

    private KoreanFontSupport() {}

    static PDFont pdType0Font(PDDocument document) {
        try (InputStream is = new ClassPathResource(FONT_RESOURCE).getInputStream()) {
            return PDType0Font.load(document, is);
        } catch (IOException e) {
            throw new ToolProcessingException("한글 폰트 로드 실패: " + e.getMessage(), e);
        }
    }

    static Font awtFont(float size) {
        try (InputStream is = new ClassPathResource(FONT_RESOURCE).getInputStream()) {
            return Font.createFont(Font.TRUETYPE_FONT, is).deriveFont(size);
        } catch (IOException | FontFormatException e) {
            throw new ToolProcessingException("한글 폰트 로드 실패: " + e.getMessage(), e);
        }
    }
}
