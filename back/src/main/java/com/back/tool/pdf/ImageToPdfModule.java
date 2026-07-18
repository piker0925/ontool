package com.back.tool.pdf;

import com.back.global.util.ExifOrientationSupport;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class ImageToPdfModule implements ToolModule {

    private static final float MM_TO_PT = 72f / 25.4f;

    @Override
    public String getId() { return "image-to-pdf"; }

    @Override
    public String getName() { return "이미지 → PDF"; }

    @Override
    public String getCategory() { return "pdf"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public boolean acceptsMultipleFiles() {
        return true;
    }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        ToolParams params = ToolParams.of(input);
        String paperSize = params.getString("paperSize", "원본");
        String orientation = params.getString("orientation", "portrait");
        int marginMm = params.getInt("margin", 0, 0, 100);
        float marginPt = marginMm * MM_TO_PT;

        PDRectangle base = resolvePaperSize(paperSize);
        boolean landscape = resolveLandscape(orientation);

        try {
            Path output = Files.createTempFile("img2pdf-", ".pdf");
            try (PDDocument doc = new PDDocument()) {
                for (Path imagePath : input.files()) {
                    PDImageXObject image = loadImage(doc, imagePath);
                    if (base == null) {
                        addOriginalSizePage(doc, image, marginPt);
                    } else {
                        addFixedSizePage(doc, image, base, landscape, marginPt);
                    }
                }
                doc.save(output.toFile());
            }
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("이미지 → PDF 변환 실패: " + e.getMessage(), e);
        }
    }

    /** EXIF Orientation이 있으면 보정 후 임베딩, 없으면 원본 바이트를 그대로 임베딩(무손실·빠름) */
    private PDImageXObject loadImage(PDDocument doc, Path imagePath) throws IOException {
        int orientation = ExifOrientationSupport.readOrientation(imagePath);
        if (orientation == 1) {
            return PDImageXObject.createFromFile(imagePath.toString(), doc);
        }
        BufferedImage original = ImageIO.read(imagePath.toFile());
        BufferedImage corrected = ExifOrientationSupport.applyOrientation(original, orientation);
        return LosslessFactory.createFromImage(doc, corrected);
    }

    /** 원본 크기: 페이지 = 이미지 크기 + 양쪽 여백, 이미지는 원본 크기 그대로 배치 */
    private void addOriginalSizePage(PDDocument doc, PDImageXObject image, float marginPt) throws IOException {
        PDPage page = new PDPage(new PDRectangle(
                image.getWidth() + 2 * marginPt, image.getHeight() + 2 * marginPt));
        doc.addPage(page);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            cs.drawImage(image, marginPt, marginPt, image.getWidth(), image.getHeight());
        }
    }

    /** 고정 용지: 여백을 제외한 영역에 비율을 유지하며 맞추고 가운데 정렬 */
    private void addFixedSizePage(PDDocument doc, PDImageXObject image, PDRectangle base,
                                  boolean landscape, float marginPt) throws IOException {
        PDRectangle rect = landscape
                ? new PDRectangle(base.getHeight(), base.getWidth())
                : new PDRectangle(base.getWidth(), base.getHeight());
        float availW = rect.getWidth() - 2 * marginPt;
        float availH = rect.getHeight() - 2 * marginPt;
        if (availW <= 0 || availH <= 0) {
            throw new ToolProcessingException(
                    "여백이 너무 커서 이미지를 배치할 공간이 없습니다. (여백: " + Math.round(marginPt / MM_TO_PT) + "mm)");
        }
        float scale = Math.min(1f, Math.min(availW / image.getWidth(), availH / image.getHeight()));
        float w = image.getWidth() * scale;
        float h = image.getHeight() * scale;
        float x = (rect.getWidth() - w) / 2;
        float y = (rect.getHeight() - h) / 2;

        PDPage page = new PDPage(rect);
        doc.addPage(page);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            cs.drawImage(image, x, y, w, h);
        }
    }

    /** @return null이면 원본 크기 사용 */
    private PDRectangle resolvePaperSize(String paperSize) {
        return switch (paperSize.trim().toUpperCase()) {
            case "A4" -> PDRectangle.A4;
            case "LETTER" -> PDRectangle.LETTER;
            case "원본", "ORIGINAL" -> null;
            default -> throw new ToolProcessingException(
                    "용지 크기는 A4, Letter, 원본 중 하나여야 합니다. (입력값: " + paperSize + ")");
        };
    }

    private boolean resolveLandscape(String orientation) {
        return switch (orientation.trim().toLowerCase()) {
            case "portrait", "세로" -> false;
            case "landscape", "가로" -> true;
            default -> throw new ToolProcessingException(
                    "방향은 portrait(세로), landscape(가로) 중 하나여야 합니다. (입력값: " + orientation + ")");
        };
    }
}
