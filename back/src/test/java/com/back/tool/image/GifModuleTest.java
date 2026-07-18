package com.back.tool.image;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.w3c.dom.NodeList;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.ImageInputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GifModuleTest {

    @TempDir
    Path tempDir;

    private final GifModule module = new GifModule();

    private Path createFrame(String name, Color color) throws Exception {
        return createFrame(name, color, 100, 100);
    }

    private Path createFrame(String name, Color color, int w, int h) throws Exception {
        Path p = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, w, h);
        g.dispose();
        ImageIO.write(img, "png", p.toFile());
        return p;
    }

    private List<Path> threeFrames() throws Exception {
        return List.of(
                createFrame("frame1.png", Color.RED),
                createFrame("frame2.png", Color.BLUE),
                createFrame("frame3.png", Color.GREEN));
    }

    /**
     * GIF 바이트에서 NETSCAPE 루프 카운트를 직접 파싱한다 (ImageIO 리더에 의존하지 않는 독립 검증).
     * 블록 구조: "NETSCAPE2.0" 다음 서브블록 {0x03, 0x01, loopLo, loopHi, 0x00}
     */
    private int readNetscapeLoopCount(Path gif) throws Exception {
        byte[] bytes = Files.readAllBytes(gif);
        byte[] sig = "NETSCAPE2.0".getBytes(StandardCharsets.US_ASCII);
        outer:
        for (int i = 0; i <= bytes.length - sig.length - 5; i++) {
            for (int j = 0; j < sig.length; j++) {
                if (bytes[i + j] != sig[j]) continue outer;
            }
            int base = i + sig.length;
            assertThat(bytes[base]).isEqualTo((byte) 0x03);     // sub-block length
            assertThat(bytes[base + 1]).isEqualTo((byte) 0x01); // netscape sub-block id
            return (bytes[base + 2] & 0xFF) | ((bytes[base + 3] & 0xFF) << 8);
        }
        throw new AssertionError("NETSCAPE 확장 블록이 GIF에 없습니다");
    }

    private IIOMetadataNode firstFrameMetadata(Path gif) throws Exception {
        ImageReader reader = ImageIO.getImageReadersByFormatName("gif").next();
        try (ImageInputStream iis = ImageIO.createImageInputStream(gif.toFile())) {
            reader.setInput(iis);
            return (IIOMetadataNode) reader.getImageMetadata(0)
                    .getAsTree("javax_imageio_gif_image_1.0");
        } finally {
            reader.dispose();
        }
    }

    private IIOMetadataNode childNode(IIOMetadataNode root, String name) {
        NodeList nodes = root.getElementsByTagName(name);
        assertThat(nodes.getLength()).as("메타데이터 노드 %s 존재", name).isGreaterThan(0);
        return (IIOMetadataNode) nodes.item(0);
    }

    @Test
    void multipleFramesProduceGifFile() throws Exception {
        ToolResult result = module.process(new ToolInput(threeFrames(), Map.of("delay", "50")));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile()).exists();
        assertThat(result.outputFile().toString()).endsWith(".gif");

        ImageReader reader = ImageIO.getImageReadersByFormatName("gif").next();
        try (ImageInputStream iis = ImageIO.createImageInputStream(result.outputFile().toFile())) {
            reader.setInput(iis);
            assertThat(reader.getNumImages(true)).isEqualTo(3);

            assertThat(dominantColor(reader.read(0))).isEqualTo(Color.RED);
            assertThat(dominantColor(reader.read(1))).isEqualTo(Color.BLUE);
            assertThat(dominantColor(reader.read(2))).isEqualTo(Color.GREEN);
        } finally {
            reader.dispose();
        }
    }

    private Color dominantColor(BufferedImage frame) {
        return new Color(frame.getRGB(frame.getWidth() / 2, frame.getHeight() / 2));
    }

    @Test
    void delayWrittenAsCentisecondsInFrameMetadata() throws Exception {
        ToolResult result = module.process(new ToolInput(threeFrames(), Map.of("delay", "50")));

        IIOMetadataNode gce = childNode(firstFrameMetadata(result.outputFile()), "GraphicControlExtension");
        assertThat(gce.getAttribute("delayTime")).isEqualTo("5"); // 50ms = 5cs
    }

    @Test
    void defaultLoopCountIsInfinite() throws Exception {
        ToolResult result = module.process(new ToolInput(threeFrames(), Map.of("delay", "50")));

        assertThat(readNetscapeLoopCount(result.outputFile())).isEqualTo(0); // 0 = 무한
    }

    @Test
    void finiteLoopCountEncodedLittleEndian() throws Exception {
        ToolResult result = module.process(new ToolInput(threeFrames(),
                Map.of("delay", "50", "loopCount", "300"))); // 300 = 0x012C → lo=0x2C, hi=0x01

        assertThat(readNetscapeLoopCount(result.outputFile())).isEqualTo(300);
    }

    @Test
    void disposalIsAlwaysRestoreToBackground() throws Exception {
        ToolResult result = module.process(new ToolInput(threeFrames(), Map.of("delay", "50")));

        IIOMetadataNode gce = childNode(firstFrameMetadata(result.outputFile()), "GraphicControlExtension");
        assertThat(gce.getAttribute("disposalMethod")).isEqualTo("restoreToBackgroundColor");
    }

    @Test
    void frameSizeParamsContainPadFillsExactTargetSizeWithoutCropping() throws Exception {
        List<Path> frames = List.of(
                createFrame("wide1.png", Color.RED, 200, 100),
                createFrame("wide2.png", Color.BLUE, 200, 100));

        ToolResult result = module.process(new ToolInput(frames,
                Map.of("delay", "100", "frameWidth", "100", "frameHeight", "100")));

        BufferedImage first = readGifFrame(result.outputFile(), 0);
        // contain은 잘라내지 않고 200x100 → 100x50으로 축소해 세로 중앙(y=25~75)에 배치한다.
        assertThat(first.getWidth()).isEqualTo(100);
        assertThat(first.getHeight()).isEqualTo(100);
        assertThat(new Color(first.getRGB(50, 50))).isEqualTo(Color.RED);   // 내용 영역
        assertThat(new Color(first.getRGB(50, 10))).isEqualTo(Color.WHITE); // 위쪽 여백
        assertThat(new Color(first.getRGB(50, 90))).isEqualTo(Color.WHITE); // 아래쪽 여백
    }

    private Path createBandedFrame(String name, int w, int h, boolean vertical) throws Exception {
        Path p = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        Color[] bands = {Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW};
        for (int i = 0; i < 4; i++) {
            g.setColor(bands[i]);
            if (vertical) {
                g.fillRect(i * (w / 4), 0, w / 4, h);
            } else {
                g.fillRect(0, i * (h / 4), w, h / 4);
            }
        }
        g.dispose();
        ImageIO.write(img, "png", p.toFile());
        return p;
    }

    @Test
    void containPadOnWideSourceKeepsAllFourBandsAndAddsTopBottomBars() throws Exception {
        // 200x100, 세로 밴드 4개(빨/초/파/노) x 50px. 100x100으로 contain-pad하면
        // 스케일=0.5(가로 기준)라 4개 밴드 전부(각 25px폭) 살아남고, 위/아래에 흰 여백이 생겨야 한다.
        // crop 방식이었다면 빨강/노랑이 잘려나가 이 assertion이 깨진다.
        // stretch(무패딩 늘리기) 버그였다면 여백 없이 가장자리까지 색이 채워져 이 assertion이 깨진다.
        List<Path> frames = List.of(createBandedFrame("banded-wide.png", 200, 100, true));

        ToolResult result = module.process(new ToolInput(frames,
                Map.of("delay", "100", "frameWidth", "100", "frameHeight", "100")));

        BufferedImage out = readGifFrame(result.outputFile(), 0);
        assertThat(out.getWidth()).isEqualTo(100);
        assertThat(out.getHeight()).isEqualTo(100);
        // 내용 영역(y=50)에 4개 밴드가 비율대로(각 25px) 전부 존재 — crop이 아님을 증명
        assertThat(new Color(out.getRGB(12, 50))).isEqualTo(Color.RED);
        assertThat(new Color(out.getRGB(37, 50))).isEqualTo(Color.GREEN);
        assertThat(new Color(out.getRGB(62, 50))).isEqualTo(Color.BLUE);
        assertThat(new Color(out.getRGB(87, 50))).isEqualTo(Color.YELLOW);
        // 위/아래 여백 — stretch가 아님을 증명
        assertThat(new Color(out.getRGB(50, 10))).isEqualTo(Color.WHITE);
        assertThat(new Color(out.getRGB(50, 90))).isEqualTo(Color.WHITE);
    }

    @Test
    void containPadOnTallSourceKeepsAllFourBandsAndAddsLeftRightBars() throws Exception {
        // 100x200, 가로 밴드 4개(빨/초/파/노) x 50px. 100x100으로 contain-pad하면
        // 스케일=0.5(세로 기준)라 4개 밴드 전부(각 25px높이) 살아남고, 좌/우에 흰 여백이 생겨야 한다.
        // 가로축만 검증하면 세로축 크롭/스트레치 버그를 놓치므로 별도로 검증한다.
        List<Path> frames = List.of(createBandedFrame("banded-tall.png", 100, 200, false));

        ToolResult result = module.process(new ToolInput(frames,
                Map.of("delay", "100", "frameWidth", "100", "frameHeight", "100")));

        BufferedImage out = readGifFrame(result.outputFile(), 0);
        assertThat(out.getWidth()).isEqualTo(100);
        assertThat(out.getHeight()).isEqualTo(100);
        assertThat(new Color(out.getRGB(50, 12))).isEqualTo(Color.RED);
        assertThat(new Color(out.getRGB(50, 37))).isEqualTo(Color.GREEN);
        assertThat(new Color(out.getRGB(50, 62))).isEqualTo(Color.BLUE);
        assertThat(new Color(out.getRGB(50, 87))).isEqualTo(Color.YELLOW);
        assertThat(new Color(out.getRGB(10, 50))).isEqualTo(Color.WHITE);
        assertThat(new Color(out.getRGB(90, 50))).isEqualTo(Color.WHITE);
    }

    private BufferedImage readGifFrame(Path gif, int index) throws Exception {
        ImageReader reader = ImageIO.getImageReadersByFormatName("gif").next();
        try (ImageInputStream iis = ImageIO.createImageInputStream(gif.toFile())) {
            reader.setInput(iis);
            return reader.read(index);
        } finally {
            reader.dispose();
        }
    }

    @Test
    void withoutFrameSizeParamsKeepsOriginalDimensionsWhenAllFramesMatch() throws Exception {
        List<Path> frames = List.of(
                createFrame("orig1.png", Color.RED, 200, 100),
                createFrame("orig2.png", Color.BLUE, 200, 100));

        ToolResult result = module.process(new ToolInput(frames, Map.of("delay", "100")));

        BufferedImage first = readGifFrame(result.outputFile(), 0);
        assertThat(first.getWidth()).isEqualTo(200);
        assertThat(first.getHeight()).isEqualTo(100);
    }

    @Test
    void mismatchedAspectRatioFramesAreNormalizedToMaxCanvasWithoutCropping() throws Exception {
        // 실사용 버그 재현: frameWidth/frameHeight를 안 정했는데 프레임마다 원본 비율이 다르면
        // 캔버스가 안 맞아 잘리거나 여백이 생기던 문제. 캔버스는 전체 프레임 중 가로·세로 최댓값
        // (200x200)이 되어야 하고, 각 프레임은 잘리지 않고 그 안에 전부 보여야 한다.
        List<Path> frames = List.of(
                createFrame("wide.png", Color.RED, 200, 100),
                createFrame("tall.png", Color.BLUE, 100, 200));

        ToolResult result = module.process(new ToolInput(frames, Map.of("delay", "100")));

        BufferedImage first = readGifFrame(result.outputFile(), 0);
        BufferedImage second = readGifFrame(result.outputFile(), 1);

        assertThat(first.getWidth()).isEqualTo(200);
        assertThat(first.getHeight()).isEqualTo(200);
        assertThat(second.getWidth()).isEqualTo(200);
        assertThat(second.getHeight()).isEqualTo(200);

        // wide(200x100)는 세로 중앙(y=50~150)에 그대로 들어가고 위/아래에 여백이 생긴다 — 잘림 없음
        assertThat(new Color(first.getRGB(100, 100))).isEqualTo(Color.RED);
        assertThat(new Color(first.getRGB(100, 10))).isEqualTo(Color.WHITE);
        assertThat(new Color(first.getRGB(100, 190))).isEqualTo(Color.WHITE);

        // tall(100x200)은 가로 중앙(x=50~150)에 그대로 들어가고 좌/우에 여백이 생긴다 — 잘림 없음
        assertThat(new Color(second.getRGB(100, 100))).isEqualTo(Color.BLUE);
        assertThat(new Color(second.getRGB(10, 100))).isEqualTo(Color.WHITE);
        assertThat(new Color(second.getRGB(190, 100))).isEqualTo(Color.WHITE);
    }

    @Test
    void defaultDelayIsFiveHundredMillis() throws Exception {
        ToolResult result = module.process(new ToolInput(threeFrames(), Map.of()));

        IIOMetadataNode gce = childNode(firstFrameMetadata(result.outputFile()), "GraphicControlExtension");
        assertThat(gce.getAttribute("delayTime")).isEqualTo("50"); // 500ms = 50cs
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("gif-create");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("image");
    }

    @Test
    void captionText가_없으면_기존과_동일하게_자막_없이_생성된다() throws Exception {
        List<Path> frames = List.of(
                createFrame("cap-none1.png", Color.RED, 200, 100),
                createFrame("cap-none2.png", Color.BLUE, 200, 100));

        ToolResult result = module.process(new ToolInput(frames, Map.of("delay", "100")));

        BufferedImage first = readGifFrame(result.outputFile(), 0);
        BufferedImage second = readGifFrame(result.outputFile(), 1);
        assertThat(first.getWidth()).isEqualTo(200);
        assertThat(first.getHeight()).isEqualTo(100);
        assertThat(new Color(first.getRGB(100, 50))).isEqualTo(Color.RED);
        assertThat(new Color(second.getRGB(100, 50))).isEqualTo(Color.BLUE);
    }

    @Test
    void captionText_지정시_모든_프레임에_동일한_자막이_실제로_렌더링된다() throws Exception {
        List<Path> frames = List.of(
                createFrame("cap1.png", Color.RED, 200, 100),
                createFrame("cap2.png", Color.BLUE, 200, 100),
                createFrame("cap3.png", Color.GREEN, 200, 100));

        ToolResult withoutCaption = module.process(new ToolInput(frames, Map.of("delay", "100")));
        ToolResult withCaption = module.process(new ToolInput(frames,
                Map.of("delay", "100", "captionText", "hello",
                        "captionColor", "#FFFF00", "captionBackground", "#000000")));

        // 기본 위치(bottom)의 자막 박스가 깔리는 y=90 지점을 세 프레임 모두에서 비교한다.
        // 배경 박스가 반투명(alpha 160)으로 원본 색과 블렌딩되므로 정확한 색상값이 아니라
        // "자막 유무에 따라 실제로 픽셀이 달라졌는지"를 비교한다(AC 문구 그대로).
        for (int i = 0; i < 3; i++) {
            BufferedImage before = readGifFrame(withoutCaption.outputFile(), i);
            BufferedImage after = readGifFrame(withCaption.outputFile(), i);
            assertThat(new Color(after.getRGB(100, 90)))
                    .as("프레임 %d의 자막 영역 픽셀이 자막 없는 버전과 달라야 한다", i)
                    .isNotEqualTo(new Color(before.getRGB(100, 90)));
        }
    }

    @Test
    void captionPosition을_top_bottom으로_바꾸면_자막이_그려지는_y영역이_실제로_달라진다() throws Exception {
        List<Path> frames = List.of(createFrame("pos1.png", Color.RED, 200, 100));

        ToolResult baseline = module.process(new ToolInput(frames, Map.of("delay", "100")));
        ToolResult topResult = module.process(new ToolInput(frames,
                Map.of("delay", "100", "captionText", "caption",
                        "captionPosition", "top", "captionColor", "#FFFF00", "captionBackground", "#000000")));
        ToolResult bottomResult = module.process(new ToolInput(frames,
                Map.of("delay", "100", "captionText", "caption",
                        "captionPosition", "bottom", "captionColor", "#FFFF00", "captionBackground", "#000000")));

        BufferedImage baseFrame = readGifFrame(baseline.outputFile(), 0);
        BufferedImage topFrame = readGifFrame(topResult.outputFile(), 0);
        BufferedImage bottomFrame = readGifFrame(bottomResult.outputFile(), 0);

        int topRowY = 5;
        int bottomRowY = 95;

        // top: 위쪽 영역은 달라지고, 아래쪽 영역은 자막 없는 버전과 동일해야 한다.
        assertThat(new Color(topFrame.getRGB(100, topRowY)))
                .isNotEqualTo(new Color(baseFrame.getRGB(100, topRowY)));
        assertThat(new Color(topFrame.getRGB(100, bottomRowY)))
                .isEqualTo(new Color(baseFrame.getRGB(100, bottomRowY)));

        // bottom: 아래쪽 영역은 달라지고, 위쪽 영역은 자막 없는 버전과 동일해야 한다.
        assertThat(new Color(bottomFrame.getRGB(100, bottomRowY)))
                .isNotEqualTo(new Color(baseFrame.getRGB(100, bottomRowY)));
        assertThat(new Color(bottomFrame.getRGB(100, topRowY)))
                .isEqualTo(new Color(baseFrame.getRGB(100, topRowY)));
    }

    @Test
    void 자막_텍스트가_프레임_너비보다_길면_줄바꿈되어_캔버스를_벗어나지_않는다() throws Exception {
        // 폭 100px에 비해 훨씬 긴 문장을 넣어 여러 줄로 줄바꿈되도록 강제하고,
        // 세로로 아주 긴 캔버스(2000px)를 써서 줄바꿈된 자막 블록이 프레임 하단까지는
        // 절대 닿지 않는다는 것을(=넘치지 않는다는 것을) 폰트 메트릭 오차와 무관하게 검증한다.
        List<Path> frames = List.of(createFrame("overflow1.png", Color.RED, 100, 2000));
        String longCaption = "this is a very long caption that cannot possibly fit on a single line "
                + "within a one hundred pixel wide frame without wrapping across many lines of text";

        ToolResult baseline = module.process(new ToolInput(frames, Map.of("delay", "100")));
        ToolResult result = module.process(new ToolInput(frames,
                Map.of("delay", "100", "captionText", longCaption,
                        "captionPosition", "top", "captionColor", "#FFFF00", "captionBackground", "#000000")));

        BufferedImage baseFrame = readGifFrame(baseline.outputFile(), 0);
        BufferedImage frame = readGifFrame(result.outputFile(), 0);

        // 캔버스 크기 자체는 절대 바뀌지 않는다(넘친 텍스트 때문에 캔버스가 커지거나 잘리지 않음).
        assertThat(frame.getWidth()).isEqualTo(100);
        assertThat(frame.getHeight()).isEqualTo(2000);

        // 여러 줄로 실제 줄바꿈되었는지: 서로 다른 두 줄 영역(y=5, y=45)이 모두
        // 자막 없는 버전과 달라야 한다 — 한 줄에 다 우겨넣었다면 두 번째 줄 영역은
        // baseline과 같았을 것이다.
        assertThat(new Color(frame.getRGB(50, 5)))
                .as("첫 줄 영역")
                .isNotEqualTo(new Color(baseFrame.getRGB(50, 5)));
        assertThat(new Color(frame.getRGB(50, 45)))
                .as("두 번째 줄 이후 영역")
                .isNotEqualTo(new Color(baseFrame.getRGB(50, 45)));

        // 프레임 하단(y=1900)은 자막 블록이 절대 도달하지 못하는 위치 — 캔버스를
        // 벗어나기는커녕 자막 블록 자체가 프레임 안 상단에 국한되어 있음을 증명한다.
        assertThat(new Color(frame.getRGB(50, 1900)))
                .isEqualTo(new Color(baseFrame.getRGB(50, 1900)));
    }
}
