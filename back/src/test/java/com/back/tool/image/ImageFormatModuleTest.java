package com.back.tool.image;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageTypeSpecifier;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.FileImageInputStream;
import javax.imageio.stream.FileImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;

class ImageFormatModuleTest {

    @TempDir
    Path tempDir;

    private final ImageFormatModule module = new ImageFormatModule();

    private String detectFormat(Path path) throws Exception {
        try (FileImageInputStream stream = new FileImageInputStream(path.toFile())) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
            if (readers.hasNext()) return readers.next().getFormatName().toLowerCase();
        }
        return "";
    }

    private Path createPng(String name, int w, int h) throws Exception {
        Path p = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ImageIO.write(img, "png", p.toFile());
        return p;
    }

    /** 픽셀마다 랜덤 색 — 품질 차이가 파일 크기에 드러나도록 하는 노이즈 이미지. */
    private Path createNoisyPng(String name, int w, int h) throws Exception {
        Path p = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Random random = new Random(7);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                img.setRGB(x, y, random.nextInt(0xFFFFFF));
            }
        }
        ImageIO.write(img, "png", p.toFile());
        return p;
    }

    /** tEXt 청크(키워드/값)를 포함한 PNG 생성 — 메타데이터 유지 여부 검증용. */
    private Path createPngWithTextMetadata(String name, String keyword, String value) throws Exception {
        Path p = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(40, 40, BufferedImage.TYPE_INT_RGB);
        ImageWriter writer = ImageIO.getImageWritersByFormatName("png").next();
        try (FileImageOutputStream stream = new FileImageOutputStream(p.toFile())) {
            writer.setOutput(stream);
            IIOMetadata meta = writer.getDefaultImageMetadata(
                    ImageTypeSpecifier.createFromRenderedImage(img), null);
            String format = "javax_imageio_png_1.0";
            IIOMetadataNode root = new IIOMetadataNode(format);
            IIOMetadataNode text = new IIOMetadataNode("tEXt");
            IIOMetadataNode entry = new IIOMetadataNode("tEXtEntry");
            entry.setAttribute("keyword", keyword);
            entry.setAttribute("value", value);
            text.appendChild(entry);
            root.appendChild(text);
            meta.mergeTree(format, root);
            writer.write(null, new IIOImage(img, null, meta), null);
        } finally {
            writer.dispose();
        }
        return p;
    }

    // 좌상단 사분면만 빨강, 나머지는 파랑 — 회전 방향이 실제로 맞는지 확인하기 위한 비대칭 이미지
    private BufferedImage asymmetricImage(int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, w, h);
        g.setColor(Color.RED);
        g.fillRect(0, 0, w / 2, h / 2);
        g.dispose();
        return img;
    }

    private static boolean isRed(int rgb) {
        Color c = new Color(rgb);
        return c.getRed() > 200 && c.getGreen() < 100 && c.getBlue() < 100;
    }

    private static boolean isGreen(int rgb) {
        Color c = new Color(rgb);
        return c.getGreen() > 200 && c.getRed() < 100 && c.getBlue() < 100;
    }

    /** EXIF Orientation 태그 하나만 담은 최소 APP1 세그먼트 (TIFF 빅엔디안, IFD0에 엔트리 1개). */
    private byte[] buildExifOrientationApp1(int orientation) throws Exception {
        ByteArrayOutputStream tiff = new ByteArrayOutputStream();
        tiff.write(new byte[]{'M', 'M', 0, 42, 0, 0, 0, 8}); // 빅엔디안, IFD0 오프셋=8
        tiff.write(new byte[]{0, 1});                        // 엔트리 1개
        tiff.write(new byte[]{0x01, 0x12});                  // tag=Orientation
        tiff.write(new byte[]{0x00, 0x03});                  // type=SHORT
        tiff.write(new byte[]{0x00, 0x00, 0x00, 0x01});      // count=1
        tiff.write(new byte[]{0x00, (byte) orientation, 0x00, 0x00}); // value + 패딩
        tiff.write(new byte[]{0x00, 0x00, 0x00, 0x00});      // next IFD offset=0
        byte[] tiffBytes = tiff.toByteArray();

        byte[] exifHeader = "Exif\0\0".getBytes(StandardCharsets.US_ASCII);
        int segLen = 2 + exifHeader.length + tiffBytes.length; // length 필드 자신 포함
        ByteArrayOutputStream app1 = new ByteArrayOutputStream();
        app1.write(0xFF);
        app1.write(0xE1);
        app1.write((segLen >> 8) & 0xFF);
        app1.write(segLen & 0xFF);
        app1.write(exifHeader);
        app1.write(tiffBytes);
        return app1.toByteArray();
    }

    /** SOI 바로 뒤에 EXIF APP1을 끼워 넣어, 실제 카메라 촬영본과 같은 구조의 JPEG을 만든다. */
    private Path createJpegWithOrientation(String name, BufferedImage image, int orientation) throws Exception {
        ByteArrayOutputStream baseline = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", baseline);
        byte[] src = baseline.toByteArray();
        byte[] app1 = buildExifOrientationApp1(orientation);

        // JFIF 스펙상 APP0(JFIF)은 SOI 바로 다음에 와야 한다 — Java 기본 JPEG 라이터가 항상 써주는
        // 그 APP0 세그먼트 뒤에 EXIF APP1을 끼워 넣는다. (SOI 바로 뒤에 넣으면 순서 위반으로 리더가 거부한다)
        if ((src[2] & 0xFF) != 0xFF || (src[3] & 0xFF) != 0xE0) {
            throw new IllegalStateException("baseline JPEG에 APP0(JFIF) 세그먼트가 없습니다");
        }
        int app0Length = ((src[4] & 0xFF) << 8) | (src[5] & 0xFF);
        int insertAt = 4 + app0Length;

        Path out = tempDir.resolve(name);
        try (OutputStream os = Files.newOutputStream(out)) {
            os.write(src, 0, insertAt);
            os.write(app1);
            os.write(src, insertAt, src.length - insertAt);
        }
        return out;
    }

    private boolean containsBytes(Path file, byte[] needle) throws Exception {
        byte[] haystack = Files.readAllBytes(file);
        outer:
        for (int i = 0; i <= haystack.length - needle.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) continue outer;
            }
            return true;
        }
        return false;
    }

    /** JPEG SOF 마커 존재 여부. 엔트로피 데이터 내 0xFF 뒤에는 0x00/RST만 오므로 오탐 없음. */
    private boolean hasJpegMarker(Path file, int markerByte) throws Exception {
        return containsBytes(file, new byte[]{(byte) 0xFF, (byte) markerByte});
    }

    @Test
    void pngToJpg() throws Exception {
        Path src = createPng("input.png", 50, 50);

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of("targetFormat", "jpg")));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile().toString()).endsWith(".jpg");
        assertThat(detectFormat(result.outputFile())).containsIgnoringCase("jpeg");
    }

    @Test
    void jpgToPng() throws Exception {
        Path src = tempDir.resolve("input.jpg");
        BufferedImage img = new BufferedImage(50, 50, BufferedImage.TYPE_INT_RGB);
        ImageIO.write(img, "jpg", src.toFile());

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of("targetFormat", "png")));

        assertThat(result.outputFile().toString()).endsWith(".png");
        assertThat(detectFormat(result.outputFile())).containsIgnoringCase("png");
    }

    @Test
    void correctsExifOrientationOnConversion() throws Exception {
        // 실사용 버그 재현: 폰으로 세로로 찍은 사진(픽셀은 가로로 저장, EXIF에 90도 회전 태그)을
        // 변환하면 예전엔 태그를 무시하고 그대로 옆으로 누운 채 나왔다.
        Path src = createJpegWithOrientation("rotated.jpg", asymmetricImage(40, 20), 6);

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of("targetFormat", "png")));

        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(20);
        assertThat(out.getHeight()).isEqualTo(40);
        // 90도 회전 후 빨강 사분면은 우상단으로 이동해야 한다 (ExifOrientationSupportTest와 동일 기준)
        assertThat(isRed(out.getRGB(out.getWidth() - 2, 2))).isTrue();
        assertThat(isRed(out.getRGB(2, 2))).isFalse();
    }

    @Test
    void noExifOrientationLeavesImageUnchanged() throws Exception {
        Path src = tempDir.resolve("normal.jpg");
        ImageIO.write(asymmetricImage(40, 20), "jpg", src.toFile());

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of("targetFormat", "png")));

        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(40);
        assertThat(out.getHeight()).isEqualTo(20);
        assertThat(isRed(out.getRGB(2, 2))).isTrue(); // 좌상단 그대로
    }

    @Test
    void orientationCorrectedJpegDropsMetadataEvenWhenKeepMetadataRequested() throws Exception {
        // 회전 보정 후에도 원본 메타데이터를 그대로 들고 가면 EXIF Orientation 태그가 남아있어
        // 뷰어가 이미 바로잡힌 픽셀을 또 돌려버릴 수 있다(이중 회전) — 이 조합에서는 버려야 한다.
        Path src = createJpegWithOrientation("rotated-meta.jpg", asymmetricImage(40, 20), 6);

        ToolResult result = module.process(new ToolInput(List.of(src),
                Map.of("targetFormat", "jpg", "keepMetadata", "true")));

        byte[] exifSignature = "Exif\0\0".getBytes(StandardCharsets.US_ASCII);
        assertThat(containsBytes(result.outputFile(), exifSignature)).isFalse();
        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(20);
        assertThat(out.getHeight()).isEqualTo(40);
    }

    @Test
    void jpegQualityLowersFileSize() throws Exception {
        Path src = createNoisyPng("noisy.png", 300, 300);

        ToolResult low = module.process(new ToolInput(List.of(src),
                Map.of("targetFormat", "jpg", "quality", "50")));
        ToolResult high = module.process(new ToolInput(List.of(src),
                Map.of("targetFormat", "jpg", "quality", "95")));

        BufferedImage lowImg = ImageIO.read(low.outputFile().toFile());
        BufferedImage highImg = ImageIO.read(high.outputFile().toFile());
        assertThat(lowImg.getWidth()).isEqualTo(300);
        assertThat(highImg.getWidth()).isEqualTo(300);
        assertThat(low.outputFile().toFile().length())
                .isLessThan(high.outputFile().toFile().length());
    }

    @Test
    void progressiveOnWritesSof2Marker() throws Exception {
        Path src = createNoisyPng("prog.png", 100, 100);

        ToolResult result = module.process(new ToolInput(List.of(src),
                Map.of("targetFormat", "jpg", "progressive", "true")));

        // SOF2(0xFFC2) = progressive DCT, baseline SOF0(0xFFC0)은 없어야 한다
        assertThat(hasJpegMarker(result.outputFile(), 0xC2)).isTrue();
        assertThat(hasJpegMarker(result.outputFile(), 0xC0)).isFalse();
    }

    @Test
    void progressiveOffWritesBaselineSof0Marker() throws Exception {
        Path src = createNoisyPng("base.png", 100, 100);

        ToolResult result = module.process(new ToolInput(List.of(src),
                Map.of("targetFormat", "jpg", "progressive", "false")));

        assertThat(hasJpegMarker(result.outputFile(), 0xC0)).isTrue();
        assertThat(hasJpegMarker(result.outputFile(), 0xC2)).isFalse();
    }

    @Test
    void keepMetadataPreservesPngTextChunkOnSameFormat() throws Exception {
        Path src = createPngWithTextMetadata("meta-on.png", "Comment", "devtoolbox-exif-probe");
        byte[] probe = "devtoolbox-exif-probe".getBytes(StandardCharsets.ISO_8859_1);
        assertThat(containsBytes(src, probe)).isTrue(); // 원본에 실제로 들어있는지 자기 검증

        ToolResult result = module.process(new ToolInput(List.of(src),
                Map.of("targetFormat", "png", "keepMetadata", "true")));

        assertThat(detectFormat(result.outputFile())).containsIgnoringCase("png");
        assertThat(containsBytes(result.outputFile(), probe)).isTrue();
    }

    @Test
    void keepMetadataOffStripsPngTextChunk() throws Exception {
        Path src = createPngWithTextMetadata("meta-off.png", "Comment", "devtoolbox-exif-probe");
        byte[] probe = "devtoolbox-exif-probe".getBytes(StandardCharsets.ISO_8859_1);

        ToolResult result = module.process(new ToolInput(List.of(src),
                Map.of("targetFormat", "png", "keepMetadata", "false")));

        assertThat(containsBytes(result.outputFile(), probe)).isFalse();
    }

    @Test
    void keepMetadataAcrossFormatsDropsMetadataButSucceeds() throws Exception {
        Path src = createPngWithTextMetadata("meta-cross.png", "Comment", "devtoolbox-exif-probe");
        byte[] probe = "devtoolbox-exif-probe".getBytes(StandardCharsets.ISO_8859_1);

        ToolResult result = module.process(new ToolInput(List.of(src),
                Map.of("targetFormat", "jpg", "keepMetadata", "true")));

        assertThat(detectFormat(result.outputFile())).containsIgnoringCase("jpeg");
        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(40);
        // keepMetadata=true여도 PNG→JPEG처럼 포맷이 바뀌면 원본 포맷 전용 메타데이터는 옮길 수 없다.
        assertThat(containsBytes(result.outputFile(), probe)).isFalse();
    }

    @Test
    void transparentPngFlattensToWhiteOnJpeg() throws Exception {
        Path src = tempDir.resolve("alpha.png");
        BufferedImage img = new BufferedImage(20, 20, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setColor(new Color(0, 0, 0, 0)); // 완전 투명
        g.fillRect(0, 0, 20, 20);
        g.dispose();
        ImageIO.write(img, "png", src.toFile());

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of("targetFormat", "jpg")));

        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        Color center = new Color(out.getRGB(10, 10));
        assertThat(center.getRed()).isGreaterThanOrEqualTo(240);
        assertThat(center.getGreen()).isGreaterThanOrEqualTo(240);
        assertThat(center.getBlue()).isGreaterThanOrEqualTo(240);
    }

    @Test
    void webpToPngConvertsSuccessfully() throws Exception {
        // TwelveMonkeys imageio-webp는 읽기 전용이라 이 모듈이 WebP를 "읽을 수" 있는지가 관건.
        // 픽셀 내용(윗절반 빨강/아랫절반 초록)까지 확인해 단순 디코드 성공이 아니라 색이 실제로 맞는지 본다.
        Path src = Path.of("src/test/resources/samples/test.webp");

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of("targetFormat", "png")));

        assertThat(detectFormat(result.outputFile())).containsIgnoringCase("png");
        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(40);
        assertThat(out.getHeight()).isEqualTo(40);
        assertThat(isRed(out.getRGB(20, 5))).isTrue();
        assertThat(isGreen(out.getRGB(20, 35))).isTrue();
    }

    @Test
    void pngToTiffConvertsSuccessfully() throws Exception {
        Path src = tempDir.resolve("input.png");
        ImageIO.write(asymmetricImage(40, 30), "png", src.toFile());

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of("targetFormat", "tiff")));

        assertThat(result.outputFile().toString()).endsWith(".tiff");
        assertThat(detectFormat(result.outputFile())).containsIgnoringCase("tif"); // TwelveMonkeys 리더는 "tif"로 보고
        BufferedImage out = ImageIO.read(result.outputFile().toFile());
        assertThat(out.getWidth()).isEqualTo(40);
        assertThat(out.getHeight()).isEqualTo(30);
        assertThat(isRed(out.getRGB(2, 2))).isTrue();
        assertThat(isRed(out.getRGB(30, 20))).isFalse();
    }

    @Test
    void invalidTargetFormatThrows() {
        Path src = tempDir.resolve("input.png");

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                module.process(new ToolInput(List.of(src), Map.of("targetFormat", "avif"))))
                .isInstanceOf(com.back.tool.model.ToolProcessingException.class);
    }

    @Test
    void 파일_0개면_ToolProcessingException을_던진다() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(com.back.tool.model.ToolProcessingException.class)
                .hasMessageContaining("처리할 파일이 없습니다");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("image-format");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("image");
    }
}
