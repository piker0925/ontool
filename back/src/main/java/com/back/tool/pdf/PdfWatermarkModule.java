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
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.geom.Point2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

/**
 * 텍스트 또는 이미지 워터마크를 삽입한다. 대상이 PDF면 PDFBox로 각 페이지에 오버레이하고,
 * 대상이 이미지(jpg/png)면 ImageIO/Graphics2D로 합성한다.
 *
 * <p>워터마크 이미지는 두 번째 {@code files} 항목으로 선택적으로 전달된다 — 대상 파일과 워터마크 이미지가
 * 하나의 job으로 함께 도착해야 하므로 {@link #acceptsMultipleFiles()}를 true로 오버라이드한다
 * (프론트가 target, watermark 순서로 업로드한다는 계약. front/ 연동은 이 이슈 범위 밖).
 */
@Component
public class PdfWatermarkModule implements ToolModule {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png");
    private static final float PDF_FONT_SIZE = 24f;
    private static final float IMAGE_FONT_SIZE = 48f;
    private static final float MARGIN = 20f;

    @Override
    public String getId() { return "pdf-watermark"; }

    @Override
    public String getName() { return "워터마크 삽입"; }

    @Override
    public String getCategory() { return "pdf"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public boolean acceptsMultipleFiles() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        if (input.files().isEmpty() || input.files().size() > 2) {
            throw new ToolProcessingException(
                    "워터마크는 대상 파일 1개와 워터마크 이미지 1개(선택)만 지원합니다. (입력 파일 수: "
                            + input.files().size() + ")");
        }
        ToolParams params = ToolParams.of(input);
        String text = params.getString("text", "");
        Path watermarkImage = input.files().size() == 2 ? input.files().get(1) : null;
        if (text.isBlank() && watermarkImage == null) {
            throw new ToolProcessingException("텍스트 워터마크 또는 워터마크 이미지 중 하나는 필요합니다.");
        }
        WatermarkPosition position = params.getEnum("position", WatermarkPosition.class, WatermarkPosition.CENTER);
        float opacity = params.getInt("opacity", 30, 0, 100) / 100f;

        Path target = input.files().get(0);
        String ext = extension(target);
        if (ext.equals("pdf")) {
            return watermarkPdf(target, text, watermarkImage, position, opacity);
        }
        if (IMAGE_EXTENSIONS.contains(ext)) {
            return watermarkImage(target, text, watermarkImage, position, opacity, ext);
        }
        throw new ToolProcessingException(
                "워터마크는 PDF 또는 이미지(jpg, png) 파일만 지원합니다. (입력 파일: " + target.getFileName() + ")");
    }

    private ToolResult watermarkPdf(Path target, String text, Path watermarkImagePath,
                                     WatermarkPosition position, float opacity) {
        try (PDDocument doc = PDDocument.load(target.toFile())) {
            PDFont font = text.isBlank() ? null : KoreanFontSupport.pdType0Font(doc);
            PDImageXObject wmImage = watermarkImagePath != null
                    ? PDImageXObject.createFromFile(watermarkImagePath.toString(), doc)
                    : null;

            for (PDPage page : doc.getPages()) {
                PDRectangle box = page.getMediaBox();
                try (PDPageContentStream cs = new PDPageContentStream(
                        doc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
                    gs.setNonStrokingAlphaConstant(opacity);
                    cs.setGraphicsStateParameters(gs);

                    if (font != null) {
                        float textWidth = font.getStringWidth(text) / 1000f * PDF_FONT_SIZE;
                        float textHeight = PDF_FONT_SIZE;
                        Point2D.Double offset = position.offset(
                                box.getWidth(), box.getHeight(), textWidth, textHeight, MARGIN);
                        float pdfY = (float) (box.getHeight() - offset.y - textHeight);
                        cs.beginText();
                        cs.setFont(font, PDF_FONT_SIZE);
                        cs.newLineAtOffset((float) offset.x, pdfY);
                        cs.showText(text);
                        cs.endText();
                    }
                    if (wmImage != null) {
                        Point2D.Double offset = position.offset(
                                box.getWidth(), box.getHeight(), wmImage.getWidth(), wmImage.getHeight(), MARGIN);
                        float pdfY = (float) (box.getHeight() - offset.y - wmImage.getHeight());
                        cs.drawImage(wmImage, (float) offset.x, pdfY, wmImage.getWidth(), wmImage.getHeight());
                    }
                }
            }
            Path output = Files.createTempFile("wm-", ".pdf");
            doc.save(output.toFile());
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("PDF 워터마크 삽입 실패: " + e.getMessage(), e);
        }
    }

    private ToolResult watermarkImage(Path target, String text, Path watermarkImagePath,
                                       WatermarkPosition position, float opacity, String ext) {
        try {
            BufferedImage base = ImageIO.read(target.toFile());
            if (base == null) {
                throw new ToolProcessingException("이미지 파일을 읽을 수 없습니다: " + target.getFileName());
            }
            BufferedImage canvas = new BufferedImage(base.getWidth(), base.getHeight(), BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = canvas.createGraphics();
            g.drawImage(base, 0, 0, null);
            g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, opacity));

            // 텍스트와 워터마크 이미지가 둘 다 주어지면 이미지가 우선한다 — PDF 분기(둘 다 그림)와 다르지만,
            // 이슈 설계상 "텍스트 또는 이미지" 중 하나만 쓰는 것이 정상 시나리오라 실사용에서는 갈릴 일이 없다.
            if (watermarkImagePath != null) {
                BufferedImage wm = ImageIO.read(watermarkImagePath.toFile());
                if (wm == null) {
                    throw new ToolProcessingException("워터마크 이미지를 읽을 수 없습니다: " + watermarkImagePath.getFileName());
                }
                Point2D.Double offset = position.offset(
                        base.getWidth(), base.getHeight(), wm.getWidth(), wm.getHeight(), MARGIN);
                g.drawImage(wm, (int) Math.round(offset.x), (int) Math.round(offset.y), null);
            } else {
                Font font = KoreanFontSupport.awtFont(IMAGE_FONT_SIZE);
                g.setFont(font);
                g.setColor(Color.RED);
                FontMetrics fm = g.getFontMetrics();
                double textWidth = fm.stringWidth(text);
                double textHeight = fm.getHeight();
                Point2D.Double offset = position.offset(
                        base.getWidth(), base.getHeight(), textWidth, textHeight, MARGIN);
                g.drawString(text, (float) offset.x, (float) (offset.y + fm.getAscent()));
            }
            g.dispose();

            boolean isJpeg = ext.equals("jpg") || ext.equals("jpeg");
            BufferedImage toWrite = isJpeg ? flattenAlpha(canvas) : canvas;
            Path output = Files.createTempFile("wm-", "." + ext);
            ImageIO.write(toWrite, isJpeg ? "jpeg" : ext, output.toFile());
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("이미지 워터마크 삽입 실패: " + e.getMessage(), e);
        }
    }

    /** JPEG은 알파 채널을 지원하지 않으므로 투명 영역을 흰 배경으로 합성한다. */
    private BufferedImage flattenAlpha(BufferedImage image) {
        BufferedImage rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, image.getWidth(), image.getHeight());
        g.drawImage(image, 0, 0, null);
        g.dispose();
        return rgb;
    }

    private String extension(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot + 1).toLowerCase() : "";
    }
}
