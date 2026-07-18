package com.back.tool.image;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Component;
import org.w3c.dom.NodeList;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageTypeSpecifier;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.FileImageOutputStream;
import javax.imageio.stream.ImageInputStream;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Component
public class GifModule implements ToolModule {

    /** 자막 배경 박스와 텍스트 사이 여백(px). */
    private static final int CAPTION_PADDING = 4;

    /** 자막 배경 박스의 불투명도(0~255) — 프레임 내용이 살짝 비치는 가독성용 반투명 박스. */
    private static final int CAPTION_BACKGROUND_ALPHA = 160;

    private enum CaptionPosition { TOP, BOTTOM }

    @Override
    public String getId() { return "gif-create"; }

    @Override
    public String getName() { return "GIF 생성"; }

    @Override
    public String getCategory() { return "image"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public boolean acceptsMultipleFiles() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        int delayMs = params.getInt("delay", 500, 10, 60000);
        int delayCs = delayMs / 10; // centiseconds
        int loopCount = params.getInt("loopCount", 0, 0, 65535); // 0 = 무한 반복
        int frameWidth = params.getInt("frameWidth", 0, 0, 10000);   // 0 = 전체 프레임 중 최대 크기 기준 자동 결정
        int frameHeight = params.getInt("frameHeight", 0, 0, 10000); // 0 = 전체 프레임 중 최대 크기 기준 자동 결정
        String captionText = params.getString("captionText", null); // 없으면 자막 미사용(기존과 동일 동작)
        CaptionPosition captionPosition =
                params.getEnum("captionPosition", CaptionPosition.class, CaptionPosition.BOTTOM);
        Color captionColor = parseHexColor(params.getString("captionColor", "#FFFFFF"), "captionColor");
        Color captionBackground =
                parseHexColor(params.getString("captionBackground", "#000000"), "captionBackground");

        try {
            int canvasWidth = frameWidth;
            int canvasHeight = frameHeight;
            if (canvasWidth <= 0 || canvasHeight <= 0) {
                int[] maxSize = detectMaxDimensions(input.files());
                if (canvasWidth <= 0) canvasWidth = maxSize[0];
                if (canvasHeight <= 0) canvasHeight = maxSize[1];
            }

            Path output = Files.createTempFile("gif-", ".gif");
            ImageWriter writer = ImageIO.getImageWritersByFormatName("gif").next();

            try (FileImageOutputStream stream = new FileImageOutputStream(output.toFile())) {
                writer.setOutput(stream);
                writer.prepareWriteSequence(null);

                for (Path framePath : input.files()) {
                    BufferedImage frame = ImageIO.read(framePath.toFile());
                    if (frame == null) {
                        throw new ToolProcessingException("이미지 파일을 읽을 수 없습니다: " + framePath.getFileName());
                    }
                    frame = containPad(frame, canvasWidth, canvasHeight);
                    if (captionText != null) {
                        drawCaption(frame, captionText, captionPosition, captionColor, captionBackground);
                    }
                    IIOMetadata meta = buildFrameMetadata(writer, frame, delayCs, loopCount);
                    writer.writeToSequence(new IIOImage(frame, null, meta), null);
                }
                writer.endWriteSequence();
            }
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("GIF 생성 실패: " + e.getMessage(), e);
        }
    }

    /** 전체 프레임 중 가로·세로 각각의 최댓값을 헤더만 읽어 파악한다 (풀 디코딩 없이 캔버스 크기 결정). */
    private int[] detectMaxDimensions(List<Path> files) throws IOException {
        int maxWidth = 0;
        int maxHeight = 0;
        for (Path path : files) {
            try (ImageInputStream iis = ImageIO.createImageInputStream(path.toFile())) {
                if (iis == null) {
                    throw new ToolProcessingException("이미지 파일을 읽을 수 없습니다: " + path.getFileName());
                }
                var readers = ImageIO.getImageReaders(iis);
                if (!readers.hasNext()) {
                    throw new ToolProcessingException("이미지 파일을 읽을 수 없습니다: " + path.getFileName());
                }
                ImageReader reader = readers.next();
                try {
                    reader.setInput(iis);
                    maxWidth = Math.max(maxWidth, reader.getWidth(0));
                    maxHeight = Math.max(maxHeight, reader.getHeight(0));
                } finally {
                    reader.dispose();
                }
            }
        }
        return new int[]{maxWidth, maxHeight};
    }

    /**
     * 원본 전체가 보이도록 캔버스 안에 맞춰 축소·확대(비율 유지) 후 중앙에 배치하고,
     * 남는 여백은 흰색으로 채운다 (CSS object-fit: contain과 동일). 자르지 않으므로
     * 원본 비율이 제각각이어도 내용 손실 없이 프레임 크기를 통일할 수 있다.
     */
    private BufferedImage containPad(BufferedImage frame, int targetWidth, int targetHeight) throws IOException {
        if (frame.getWidth() == targetWidth && frame.getHeight() == targetHeight) return frame;

        double scale = Math.min(targetWidth / (double) frame.getWidth(), targetHeight / (double) frame.getHeight());
        int scaledWidth = Math.max(1, (int) Math.round(frame.getWidth() * scale));
        int scaledHeight = Math.max(1, (int) Math.round(frame.getHeight() * scale));
        BufferedImage scaled = (scaledWidth == frame.getWidth() && scaledHeight == frame.getHeight())
                ? frame
                : Thumbnails.of(frame).forceSize(scaledWidth, scaledHeight).asBufferedImage();

        BufferedImage padded = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = padded.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, targetWidth, targetHeight);
        g.drawImage(scaled, (targetWidth - scaledWidth) / 2, (targetHeight - scaledHeight) / 2, null);
        g.dispose();
        return padded;
    }

    /**
     * 최종 프레임(패딩까지 끝난 상태) 위에 자막을 합성한다. 항상 이 프레임 자체의 크기를 기준으로
     * 위치를 계산하므로 containPad의 내부 여백 오프셋과는 무관하게 동작한다.
     * 텍스트가 프레임 폭보다 길면 단어 단위로 줄바꿈하고, 그래도 넘치는 줄은 프레임 높이를
     * 넘지 않는 범위까지만 그린다(그 이상은 그리지 않고 멈춤 — 캔버스 밖으로 넘치지 않음).
     */
    private void drawCaption(BufferedImage frame, String captionText, CaptionPosition position,
                              Color textColor, Color backgroundColor) {
        Graphics2D g = frame.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            // 짧은 변을 기준으로 폰트 크기를 정한다 — 가로세로 비율이 극단적인 프레임(가늘고 긴 등)에서도
            // 자막 크기가 과도하게 커지거나 작아지지 않게 상한·하한을 둔다.
            int shortSide = Math.min(frame.getWidth(), frame.getHeight());
            int fontSize = Math.max(12, Math.min(32, shortSide / 10));
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, fontSize));
            FontMetrics fm = g.getFontMetrics();

            int maxTextWidth = Math.max(1, frame.getWidth() - CAPTION_PADDING * 2);
            List<String> lines = wrapToLines(captionText, fm, maxTextWidth);

            int lineHeight = fm.getHeight();
            int blockHeight = Math.min(lineHeight * lines.size(), frame.getHeight());
            int startY = (position == CaptionPosition.TOP)
                    ? 0
                    : Math.max(0, frame.getHeight() - blockHeight);

            g.setColor(withAlpha(backgroundColor, CAPTION_BACKGROUND_ALPHA));
            g.fillRect(0, startY, frame.getWidth(), blockHeight);

            g.setColor(textColor);
            int baseline = startY + fm.getAscent();
            for (String line : lines) {
                if (baseline - fm.getAscent() >= frame.getHeight()) break; // 캔버스 높이 초과 시 중단
                int lineWidth = fm.stringWidth(line);
                int x = Math.max(CAPTION_PADDING, (frame.getWidth() - lineWidth) / 2);
                g.drawString(line, x, baseline);
                baseline += lineHeight;
            }
        } finally {
            g.dispose();
        }
    }

    /** 단어 단위 그리디 줄바꿈. 한 단어만으로도 maxWidth를 넘으면 그 단어 하나를 그대로 한 줄로 둔다
     *  (Graphics2D는 BufferedImage 래스터 밖으로는 애초에 그릴 수 없으므로 캔버스 밖 유출은 없다). */
    private List<String> wrapToLines(String text, FontMetrics fm, int maxWidth) {
        List<String> lines = new ArrayList<>();
        for (String rawLine : text.split("\\R", -1)) {
            StringBuilder current = new StringBuilder();
            for (String word : rawLine.split(" ")) {
                if (word.isEmpty()) continue;
                String candidate = current.isEmpty() ? word : current + " " + word;
                if (current.isEmpty() || fm.stringWidth(candidate) <= maxWidth) {
                    current = new StringBuilder(candidate);
                } else {
                    lines.add(current.toString());
                    current = new StringBuilder(word);
                }
            }
            lines.add(current.toString());
        }
        return lines;
    }

    /** "#RRGGBB" 또는 "RRGGBB" 형식의 hex 색상을 Color로 변환한다. */
    private Color parseHexColor(String hex, String paramName) {
        String v = hex.trim();
        if (v.startsWith("#")) {
            v = v.substring(1);
        }
        if (!v.matches("[0-9a-fA-F]{6}")) {
            throw new ToolProcessingException(
                    "파라미터 '" + paramName + "'는 #RRGGBB 형식의 hex 색상이어야 합니다. (입력값: " + hex + ")");
        }
        return new Color(Integer.parseInt(v, 16));
    }

    private Color withAlpha(Color color, int alpha) {
        return new Color(color.getRed(), color.getGreen(), color.getBlue(), alpha);
    }

    private IIOMetadata buildFrameMetadata(ImageWriter writer, BufferedImage frame,
                                           int delayCs, int loopCount) throws IOException {
        IIOMetadata meta = writer.getDefaultImageMetadata(
                ImageTypeSpecifier.createFromRenderedImage(frame), null);
        String format = meta.getNativeMetadataFormatName();
        IIOMetadataNode root = (IIOMetadataNode) meta.getAsTree(format);

        // Graphic Control Extension — frame delay.
        // disposalMethod는 매 프레임이 캔버스 전체를 덮는 불투명 이미지라 어떤 값이든
        // 결과가 동일해 사용자 옵션에서 제거하고 관행값(restoreToBackgroundColor)으로 고정한다.
        IIOMetadataNode gce = getOrCreate(root, "GraphicControlExtension");
        gce.setAttribute("disposalMethod", "restoreToBackgroundColor");
        gce.setAttribute("userInputFlag", "FALSE");
        gce.setAttribute("transparentColorFlag", "FALSE");
        gce.setAttribute("delayTime", String.valueOf(delayCs));
        gce.setAttribute("transparentColorIndex", "0");

        // Application Extension — Netscape loop (0 = 무한, N = N회 반복)
        IIOMetadataNode appExts = getOrCreate(root, "ApplicationExtensions");
        IIOMetadataNode appExt = new IIOMetadataNode("ApplicationExtension");
        appExt.setAttribute("applicationID", "NETSCAPE");
        appExt.setAttribute("authenticationCode", "2.0");
        appExt.setUserObject(new byte[]{
                0x1,
                (byte) (loopCount & 0xFF),        // little-endian short
                (byte) ((loopCount >> 8) & 0xFF),
        });
        appExts.appendChild(appExt);

        meta.setFromTree(format, root);
        return meta;
    }

    private IIOMetadataNode getOrCreate(IIOMetadataNode root, String nodeName) {
        NodeList nodes = root.getElementsByTagName(nodeName);
        if (nodes.getLength() > 0) return (IIOMetadataNode) nodes.item(0);
        IIOMetadataNode node = new IIOMetadataNode(nodeName);
        root.appendChild(node);
        return node;
    }
}
