package com.back.tool.image;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExifRemoveModuleTest {

    @TempDir
    Path tempDir;

    private final ExifRemoveModule module = new ExifRemoveModule();

    // 좌상단만 빨강, 나머지는 파랑 — 픽셀 데이터가 실제로 그대로인지(무손실) 확인하기 위한 비대칭 이미지
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

    private byte[] baselineJpeg(BufferedImage image) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", baos);
        return baos.toByteArray();
    }

    /** EXIF Orientation 태그 하나만 담은 최소 APP1 세그먼트 (TIFF 빅엔디안, IFD0에 엔트리 1개). */
    private byte[] buildExifApp1(int orientation) throws Exception {
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
        int segLen = 2 + exifHeader.length + tiffBytes.length;
        ByteArrayOutputStream app1 = new ByteArrayOutputStream();
        app1.write(0xFF);
        app1.write(0xE1);
        app1.write((segLen >> 8) & 0xFF);
        app1.write(segLen & 0xFF);
        app1.write(exifHeader);
        app1.write(tiffBytes);
        return app1.toByteArray();
    }

    /** baseline JPEG의 APP0(JFIF) 세그먼트 바로 뒤에 임의의 세그먼트(APP1 등)를 끼워 넣어 실제 카메라 촬영본과 같은 구조를 만든다. */
    private byte[] spliceExifAfterApp0(byte[] baseline, byte[] app1) throws Exception {
        if ((baseline[2] & 0xFF) != 0xFF || (baseline[3] & 0xFF) != 0xE0) {
            throw new IllegalStateException("baseline JPEG에 APP0(JFIF) 세그먼트가 없습니다");
        }
        int app0Length = ((baseline[4] & 0xFF) << 8) | (baseline[5] & 0xFF);
        int insertAt = 4 + app0Length;

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(baseline, 0, insertAt);
        out.write(app1);
        out.write(baseline, insertAt, baseline.length - insertAt);
        return out.toByteArray();
    }

    /** JFIF(APP0)조차 없이 SOI 바로 뒤에 세그먼트를 끼워 넣는다 — APP0 유무에 의존하지 않는지 확인용. */
    private byte[] spliceRightAfterSoi(byte[] baseline, byte[] segment) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(baseline, 0, 2); // SOI
        out.write(segment);
        out.write(baseline, 2, baseline.length - 2);
        return out.toByteArray();
    }

    /**
     * XMP APP1처럼 "Exif\0\0" 식별자가 아닌 APP1 세그먼트를 만든다 — EXIF가 아닌 세그먼트는 살아남아야
     * 한다는 걸 증명하기 위한 픽스처(실제 XMP 식별자 문자열을 그대로 사용하되 페이로드는 임의 텍스트).
     */
    private byte[] buildNonExifApp1(String probeText) throws Exception {
        byte[] identifier = "http://ns.adobe.com/xap/1.0/\0".getBytes(StandardCharsets.US_ASCII);
        byte[] payload = probeText.getBytes(StandardCharsets.US_ASCII);
        int segLen = 2 + identifier.length + payload.length;
        ByteArrayOutputStream app1 = new ByteArrayOutputStream();
        app1.write(0xFF);
        app1.write(0xE1);
        app1.write((segLen >> 8) & 0xFF);
        app1.write(segLen & 0xFF);
        app1.write(identifier);
        app1.write(payload);
        return app1.toByteArray();
    }

    private Path writeFile(String name, byte[] bytes) throws Exception {
        Path p = tempDir.resolve(name);
        Files.write(p, bytes);
        return p;
    }

    private boolean containsBytes(byte[] haystack, byte[] needle) {
        outer:
        for (int i = 0; i <= haystack.length - needle.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) continue outer;
            }
            return true;
        }
        return false;
    }

    private int[] pixelsOf(byte[] jpegBytes) throws Exception {
        BufferedImage img = ImageIO.read(new java.io.ByteArrayInputStream(jpegBytes));
        return img.getRGB(0, 0, img.getWidth(), img.getHeight(), null, 0, img.getWidth());
    }

    @Test
    void removesExifSegmentAndRestoresByteIdenticalBaseline() throws Exception {
        byte[] baseline = baselineJpeg(asymmetricImage(40, 20));
        byte[] app1 = buildExifApp1(3);
        byte[] withExif = spliceExifAfterApp0(baseline, app1);
        // 자기 검증: 실제로 EXIF 바이트가 삽입되어 baseline과 달라졌는지 먼저 확인 (그렇지 않으면 이 테스트는 공허하게 통과한다)
        assertThat(withExif).isNotEqualTo(baseline);
        assertThat(containsBytes(withExif, "Exif\0\0".getBytes(StandardCharsets.US_ASCII))).isTrue();
        Path src = writeFile("with-exif.jpg", withExif);

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of()));

        byte[] resultBytes = Files.readAllBytes(result.outputFile());
        // 독립적으로 구성한 기준값(app1을 붙이기 전 baseline)과 바이트 단위로 완전히 동일해야 한다 —
        // 재인코딩이 아니라 삽입했던 세그먼트만 정확히 제거됐다는 가장 강한 증거.
        assertThat(resultBytes).isEqualTo(baseline);
    }

    @Test
    void metadataLibraryConfirmsExifTagGoneAfterRemoval() throws Exception {
        byte[] baseline = baselineJpeg(asymmetricImage(40, 20));
        byte[] withExif = spliceExifAfterApp0(baseline, buildExifApp1(6));
        Path src = writeFile("with-exif2.jpg", withExif);

        // 자기 검증: 삽입 직후 원본에서는 metadata-extractor가 Orientation 태그를 실제로 읽어낸다
        Metadata beforeMeta = ImageMetadataReader.readMetadata(src.toFile());
        ExifIFD0Directory beforeDir = beforeMeta.getFirstDirectoryOfType(ExifIFD0Directory.class);
        assertThat(beforeDir).isNotNull();
        assertThat(beforeDir.containsTag(ExifIFD0Directory.TAG_ORIENTATION)).isTrue();

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of()));

        // 파일 크기 변화가 아니라 별도 메타데이터 파싱 라이브러리로 재검증한다
        Metadata afterMeta = ImageMetadataReader.readMetadata(result.outputFile().toFile());
        ExifIFD0Directory afterDir = afterMeta.getFirstDirectoryOfType(ExifIFD0Directory.class);
        assertThat(afterDir).isNull();
    }

    @Test
    void pixelDataIsUnchanged() throws Exception {
        BufferedImage source = asymmetricImage(60, 30);
        byte[] baseline = baselineJpeg(source);
        byte[] withExif = spliceExifAfterApp0(baseline, buildExifApp1(3));
        Path src = writeFile("pixel-check.jpg", withExif);

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of()));

        byte[] resultBytes = Files.readAllBytes(result.outputFile());
        int[] baselinePixels = pixelsOf(baseline);
        int[] resultPixels = pixelsOf(resultBytes);
        assertThat(resultPixels).isEqualTo(baselinePixels);
    }

    @Test
    void jpegWithoutExifProcessesWithoutErrorAndStaysUnchanged() throws Exception {
        byte[] baseline = baselineJpeg(asymmetricImage(30, 30));
        Path src = writeFile("no-exif.jpg", baseline);

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of()));

        byte[] resultBytes = Files.readAllBytes(result.outputFile());
        assertThat(resultBytes).isEqualTo(baseline);
    }

    @Test
    void onlyExifApp1IsRemovedOtherApp1SegmentsSurvive() throws Exception {
        // EXIF만 지운다는 설계를 검증한다: EXIF가 아닌 APP1(예: XMP)은 그대로 남아야 한다.
        // 식별자 체크를 지우고 "SOS 이전 APP1 전부 제거"로 퇴화해도 removesExifSegment... 류 테스트는
        // 여전히 통과하므로, 이 테스트가 그 구분을 강제하는 유일한 지점이다.
        byte[] baseline = baselineJpeg(asymmetricImage(50, 25));
        byte[] exifApp1 = buildExifApp1(3);
        byte[] xmpApp1 = buildNonExifApp1("PROBE-XMP-DATA");

        byte[] withExifOnly = spliceExifAfterApp0(baseline, exifApp1);      // APP0, EXIF, ...
        byte[] withBoth = spliceExifAfterApp0(withExifOnly, xmpApp1);       // APP0, XMP, EXIF, ...
        byte[] expectedAfterStrip = spliceExifAfterApp0(baseline, xmpApp1); // APP0, XMP, ... (EXIF만 빠짐)
        assertThat(withBoth).isNotEqualTo(expectedAfterStrip); // 자기 검증: EXIF가 실제로 더 들어있었다
        Path src = writeFile("with-both-app1.jpg", withBoth);

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of()));

        byte[] resultBytes = Files.readAllBytes(result.outputFile());
        assertThat(containsBytes(resultBytes, "Exif\0\0".getBytes(StandardCharsets.US_ASCII))).isFalse();
        assertThat(containsBytes(resultBytes, "PROBE-XMP-DATA".getBytes(StandardCharsets.US_ASCII))).isTrue();
        assertThat(resultBytes).isEqualTo(expectedAfterStrip);
    }

    @Test
    void exifRightAfterSoiWithoutJfifIsAlsoRemoved() throws Exception {
        // JFIF(APP0) 없이 SOI 바로 뒤에 EXIF가 오는 구조(일부 카메라·도구 산출물)도 처리해야 한다.
        byte[] baseline = baselineJpeg(asymmetricImage(40, 20));
        byte[] withExifAtStart = spliceRightAfterSoi(baseline, buildExifApp1(3));
        assertThat(withExifAtStart).isNotEqualTo(baseline);
        Path src = writeFile("exif-after-soi.jpg", withExifAtStart);

        ToolResult result = module.process(new ToolInput(List.of(src), Map.of()));

        byte[] resultBytes = Files.readAllBytes(result.outputFile());
        assertThat(resultBytes).isEqualTo(baseline);
    }

    @Test
    void nonJpegInputThrowsClearError() throws Exception {
        Path src = tempDir.resolve("input.dat");
        Files.write(src, "이 파일은 JPEG가 아닙니다".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(src), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("JPEG");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("exif-remove");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("image");
    }
}
