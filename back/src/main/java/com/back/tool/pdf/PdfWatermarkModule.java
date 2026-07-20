package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.util.Matrix;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;
import java.awt.geom.Point2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 텍스트(여러 개, 각자 위치·색상·크기·적용 페이지 지정 가능) 또는 이미지 워터마크를 삽입한다.
 * 대상이 PDF면 PDFBox로 각 페이지에 오버레이하고, 대상이 이미지(jpg/png)면 ImageIO/Graphics2D로 합성한다.
 *
 * <p>텍스트 요소는 {@code textElements} JSON 배열로 받는다 — 프론트의 드래그 편집기가 페이지 썸네일 위
 * 화면 좌표를 퍼센트(0~100, 페이지 크기에 독립적)로 변환해 보낸다. 각 요소의 {@code page}가 null이면
 * 모든 페이지에 동일하게, 정수면 그 페이지(1-base)에만 렌더링한다.
 *
 * <p>워터마크 이미지는 두 번째 {@code files} 항목으로 선택적으로 전달된다 — 대상 파일과 워터마크 이미지가
 * 하나의 job으로 함께 도착해야 하므로 {@link #acceptsMultipleFiles()}를 true로 오버라이드한다.
 */
@Component
public class PdfWatermarkModule implements ToolModule {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png");
    private static final float MARGIN = 20f;
    private static final double TILE_ANGLE_DEGREES = 45.0;
    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

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
        List<TextElement> elements = parseElements(params.getString("textElements", "[]"));
        Path watermarkImage = input.files().size() == 2 ? input.files().get(1) : null;
        if (elements.isEmpty() && watermarkImage == null) {
            throw new ToolProcessingException("텍스트 워터마크 또는 워터마크 이미지 중 하나는 필요합니다.");
        }
        WatermarkPosition position = params.getEnum("position", WatermarkPosition.class, WatermarkPosition.CENTER);
        float opacity = params.getInt("opacity", 30, 0, 100) / 100f;

        Path target = input.files().get(0);
        String ext = extension(target);
        if (ext.equals("pdf")) {
            return watermarkPdf(target, elements, watermarkImage, position, opacity);
        }
        if (IMAGE_EXTENSIONS.contains(ext)) {
            return watermarkImage(target, elements, watermarkImage, position, opacity, ext);
        }
        throw new ToolProcessingException(
                "워터마크는 PDF 또는 이미지(jpg, png) 파일만 지원합니다. (입력 파일: " + target.getFileName() + ")");
    }

    private List<TextElement> parseElements(String json) {
        List<TextElement> elements;
        try {
            elements = JSON.readValue(json, new TypeReference<List<TextElement>>() { });
        } catch (Exception e) {
            throw new ToolProcessingException("워터마크 텍스트 데이터 형식이 올바르지 않습니다: " + e.getMessage(), e);
        }
        for (TextElement element : elements) {
            if (element.text() == null || element.text().isBlank()) {
                throw new ToolProcessingException("워터마크 텍스트는 비어 있을 수 없습니다.");
            }
            if (element.fontSize() < 8 || element.fontSize() > 300) {
                throw new ToolProcessingException(
                        "워터마크 글자 크기는 8~300 사이여야 합니다. (입력값: " + element.fontSize() + ")");
            }
            parseWeight(element.fontWeight());
        }
        return elements;
    }

    private KoreanFontSupport.FontWeight parseWeight(String value) {
        if (value == null || value.isBlank()) return KoreanFontSupport.FontWeight.REGULAR;
        try {
            return KoreanFontSupport.FontWeight.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ToolProcessingException(
                    "워터마크 글꼴 굵기는 REGULAR/MEDIUM/BOLD/BLACK 중 하나여야 합니다. (입력값: " + value + ")");
        }
    }

    private Color parseColor(String hex) {
        String h = (hex == null || hex.isBlank()) ? "000000" : hex.trim();
        if (h.startsWith("#")) h = h.substring(1);
        if (!h.matches("[0-9a-fA-F]{6}")) {
            throw new ToolProcessingException("워터마크 색상은 #RRGGBB 형식이어야 합니다. (입력값: " + hex + ")");
        }
        return new Color(Integer.parseInt(h, 16));
    }

    private boolean isTiled(TextElement element) {
        return Boolean.TRUE.equals(element.tiled());
    }

    /**
     * 텍스트를 {@link #TILE_ANGLE_DEGREES}도 회전시켜 페이지(또는 이미지) 전체를 촘촘히 반복해서 채운다
     * (공공기관 서류·유출 방지용 배경 워터마크 패턴). 페이지 대각선 길이만큼 격자를 사방으로 넉넉히 확장해
     * 그리므로 모서리까지 빈틈없이 덮이고, 페이지 경계 밖으로 나가는 타일은 PDF 뷰어가 알아서 잘라낸다.
     */
    private void drawTiledText(PDPageContentStream cs, PDFont font, String text, float fontSize, PDRectangle box)
            throws IOException {
        float textWidth = font.getStringWidth(text) / 1000f * fontSize;
        float stepX = textWidth + fontSize * 2f;
        float stepY = fontSize * 3f;
        float centerX = box.getWidth() / 2f;
        float centerY = box.getHeight() / 2f;
        double angleRad = Math.toRadians(TILE_ANGLE_DEGREES);
        double diagonal = Math.hypot(box.getWidth(), box.getHeight());
        int cols = (int) Math.ceil(diagonal / stepX) + 1;
        int rows = (int) Math.ceil(diagonal / stepY) + 1;

        for (int row = -rows; row <= rows; row++) {
            for (int col = -cols; col <= cols; col++) {
                float localX = col * stepX;
                float localY = row * stepY;
                float rotatedX = (float) (localX * Math.cos(angleRad) - localY * Math.sin(angleRad)) + centerX;
                float rotatedY = (float) (localX * Math.sin(angleRad) + localY * Math.cos(angleRad)) + centerY;
                cs.beginText();
                cs.setFont(font, fontSize);
                cs.setTextMatrix(Matrix.getRotateInstance(angleRad, rotatedX, rotatedY));
                cs.showText(text);
                cs.endText();
            }
        }
    }

    private ToolResult watermarkPdf(Path target, List<TextElement> elements, Path watermarkImagePath,
                                     WatermarkPosition position, float opacity) {
        try (PDDocument doc = PDDocument.load(target.toFile())) {
            Map<KoreanFontSupport.FontWeight, PDFont> fontCache = new EnumMap<>(KoreanFontSupport.FontWeight.class);
            PDImageXObject wmImage = watermarkImagePath != null
                    ? PDImageXObject.createFromFile(watermarkImagePath.toString(), doc)
                    : null;

            int totalPages = doc.getNumberOfPages();
            for (int i = 0; i < totalPages; i++) {
                int pageNumber = i + 1;
                PDPage page = doc.getPage(i);
                PDRectangle box = page.getMediaBox();
                try (PDPageContentStream cs = new PDPageContentStream(
                        doc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
                    gs.setNonStrokingAlphaConstant(opacity);
                    cs.setGraphicsStateParameters(gs);

                    for (TextElement element : elements) {
                        if (element.page() != null && element.page() != pageNumber) continue;
                        float fontSize = element.fontSize();
                        KoreanFontSupport.FontWeight weight = parseWeight(element.fontWeight());
                        PDFont font = fontCache.computeIfAbsent(weight, w -> KoreanFontSupport.pdType0Font(doc, w));
                        cs.setNonStrokingColor(parseColor(element.color()));
                        if (isTiled(element)) {
                            drawTiledText(cs, font, element.text(), fontSize, box);
                        } else {
                            float x = (float) (element.xPercent() / 100.0 * box.getWidth());
                            float topY = (float) (element.yPercent() / 100.0 * box.getHeight());
                            float pdfY = box.getHeight() - topY - fontSize;
                            cs.beginText();
                            cs.setFont(font, fontSize);
                            cs.newLineAtOffset(x, pdfY);
                            cs.showText(element.text());
                            cs.endText();
                        }
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

    private ToolResult watermarkImage(Path target, List<TextElement> elements, Path watermarkImagePath,
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

            // 텍스트 요소와 워터마크 이미지가 둘 다 주어지면 이미지가 우선한다 — PDF 분기(둘 다 그림)와 다르지만,
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
                // 이미지 대상은 "페이지" 개념이 없으므로 page 필드는 무시하고 모든 요소를 그린다.
                for (TextElement element : elements) {
                    Font font = KoreanFontSupport.awtFont(element.fontSize(), parseWeight(element.fontWeight()));
                    g.setFont(font);
                    g.setColor(parseColor(element.color()));
                    if (isTiled(element)) {
                        drawTiledText(g, font, element.text(), base.getWidth(), base.getHeight());
                    } else {
                        FontMetrics fm = g.getFontMetrics();
                        float x = (float) (element.xPercent() / 100.0 * base.getWidth());
                        float topY = (float) (element.yPercent() / 100.0 * base.getHeight());
                        g.drawString(element.text(), x, topY + fm.getAscent());
                    }
                }
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

    /** {@link #drawTiledText(PDPageContentStream, PDFont, String, float, PDRectangle)}의 이미지 대상 버전. */
    private void drawTiledText(Graphics2D g, Font font, String text, int width, int height) {
        FontMetrics fm = g.getFontMetrics(font);
        float textWidth = fm.stringWidth(text);
        float stepX = textWidth + font.getSize2D() * 2f;
        float stepY = font.getSize2D() * 3f;
        double diagonal = Math.hypot(width, height);
        int cols = (int) Math.ceil(diagonal / stepX) + 1;
        int rows = (int) Math.ceil(diagonal / stepY) + 1;

        AffineTransform original = g.getTransform();
        g.translate(width / 2.0, height / 2.0);
        g.rotate(Math.toRadians(TILE_ANGLE_DEGREES));
        for (int row = -rows; row <= rows; row++) {
            for (int col = -cols; col <= cols; col++) {
                g.drawString(text, col * stepX, row * stepY);
            }
        }
        g.setTransform(original);
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

    /**
     * 워터마크 텍스트 한 개. xPercent/yPercent는 페이지(또는 이미지) 좌상단 기준 0~100 퍼센트 좌표 —
     * 실제 페이지 크기와 무관하게 프론트 드래그 편집기의 화면 좌표를 그대로 변환해 담을 수 있다.
     * page가 null이면 모든 페이지, 정수(1-base)면 그 페이지에만 적용한다(이미지 대상에는 의미 없음).
     * fontWeight는 REGULAR/MEDIUM/BOLD/BLACK(대소문자 무관, 생략 시 REGULAR) — 번들된 Pretendard 굵기.
     * tiled가 true면 xPercent/yPercent는 무시하고 45도 회전한 텍스트를 페이지(또는 이미지) 전체에
     * 반복해서 채운다(생략 시 false).
     */
    record TextElement(String text, double xPercent, double yPercent, String color, int fontSize, Integer page,
                        String fontWeight, Boolean tiled) {
    }
}
