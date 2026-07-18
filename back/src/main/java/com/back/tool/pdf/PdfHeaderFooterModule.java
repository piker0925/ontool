package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * 각 페이지에 헤더/푸터 텍스트와 페이지번호({@code pageNumberFormat}의 {page}/{total} 치환)를 오버레이한다.
 * 헤더는 페이지 상단, 푸터는 하단 좌측, 페이지번호는 하단 우측에 그린다.
 */
@Component
public class PdfHeaderFooterModule implements ToolModule {

    private static final float FONT_SIZE = 10f;
    private static final float MARGIN = 20f;

    @Override
    public String getId() { return "pdf-header-footer"; }

    @Override
    public String getName() { return "PDF 헤더/푸터/페이지번호"; }

    @Override
    public String getCategory() { return "pdf"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String headerText = params.getString("headerText", "");
        String footerText = params.getString("footerText", "");
        String pageNumberFormat = params.getString("pageNumberFormat", "");
        if (headerText.isBlank() && footerText.isBlank() && pageNumberFormat.isBlank()) {
            throw new ToolProcessingException("헤더, 푸터, 페이지번호 형식 중 하나는 입력해야 합니다.");
        }

        Path pdf = input.files().get(0);
        requirePdfExtension(pdf);

        try (PDDocument doc = PDDocument.load(pdf.toFile())) {
            PDFont font = KoreanFontSupport.pdType0Font(doc);
            int total = doc.getNumberOfPages();
            for (int i = 0; i < total; i++) {
                PDPage page = doc.getPage(i);
                PDRectangle box = page.getMediaBox();
                try (PDPageContentStream cs = new PDPageContentStream(
                        doc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    if (!headerText.isBlank()) {
                        drawText(cs, font, headerText, MARGIN, box.getHeight() - MARGIN);
                    }
                    if (!footerText.isBlank()) {
                        drawText(cs, font, footerText, MARGIN, MARGIN);
                    }
                    if (!pageNumberFormat.isBlank()) {
                        String pageNumber = pageNumberFormat
                                .replace("{page}", String.valueOf(i + 1))
                                .replace("{total}", String.valueOf(total));
                        float textWidth = font.getStringWidth(pageNumber) / 1000f * FONT_SIZE;
                        drawText(cs, font, pageNumber, box.getWidth() - MARGIN - textWidth, MARGIN);
                    }
                }
            }
            Path output = Files.createTempFile("hf-", ".pdf");
            doc.save(output.toFile());
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("헤더/푸터 삽입 실패: " + e.getMessage(), e);
        }
    }

    private void drawText(PDPageContentStream cs, PDFont font, String text, float x, float y) throws IOException {
        cs.beginText();
        cs.setFont(font, FONT_SIZE);
        cs.newLineAtOffset(x, y);
        cs.showText(text);
        cs.endText();
    }

    private void requirePdfExtension(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        if (!name.endsWith(".pdf")) {
            throw new ToolProcessingException("PDF 파일만 지원합니다. (입력 파일: " + file.getFileName() + ")");
        }
    }
}
