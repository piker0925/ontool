package com.back.support;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * 카메라 촬영본처럼 EXIF Orientation 태그를 담은 JPEG을 만드는 테스트 픽스처.
 * {@code ImageFormatModuleTest}에서 검증된 APP1 세그먼트 조립 로직을 여러 모듈 테스트
 * (116: PdfWatermarkModule, ImageResizeModule, ImageCollageModule, GifModule)가 공유하기 위해 분리했다.
 */
public final class ExifJpegFixtures {

    private ExifJpegFixtures() {}

    /** 좌상단 사분면만 빨강, 나머지는 파랑 — 회전 "방향"이 실제로 맞는지 확인하기 위한 비대칭 이미지. */
    public static BufferedImage asymmetricImage(int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, w, h);
        g.setColor(Color.RED);
        g.fillRect(0, 0, w / 2, h / 2);
        g.dispose();
        return img;
    }

    public static boolean isRed(int rgb) {
        Color c = new Color(rgb);
        return c.getRed() > 200 && c.getGreen() < 100 && c.getBlue() < 100;
    }

    /** EXIF Orientation 태그 하나만 담은 최소 APP1 세그먼트 (TIFF 빅엔디안, IFD0에 엔트리 1개). */
    private static byte[] buildExifOrientationApp1(int orientation) throws Exception {
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

    /**
     * SOI 바로 뒤 APP0(JFIF) 세그먼트 다음에 EXIF APP1을 끼워 넣어, 실제 카메라 촬영본과 같은 구조의
     * JPEG을 만든다. {@code dir}에 {@code name} 파일로 써서 그 경로를 반환한다.
     */
    public static Path createJpegWithOrientation(Path dir, String name, BufferedImage image, int orientation)
            throws Exception {
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

        Path out = dir.resolve(name);
        try (OutputStream os = Files.newOutputStream(out)) {
            os.write(src, 0, insertAt);
            os.write(app1);
            os.write(src, insertAt, src.length - insertAt);
        }
        return out;
    }
}
