package com.back.global.util;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;

import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.nio.file.Path;

/** 카메라 EXIF Orientation 태그를 읽어 픽셀을 실제 보이는 방향으로 맞춘다. 대부분의 디코더는 이 태그를 무시하므로 직접 보정 필요. */
public final class ExifOrientationSupport {

    private ExifOrientationSupport() {}

    /** @return EXIF Orientation 값 (1=정상). 태그가 없거나 읽기 실패 시 1 */
    public static int readOrientation(Path imagePath) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(imagePath.toFile());
            ExifIFD0Directory dir = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            if (dir != null && dir.containsTag(ExifIFD0Directory.TAG_ORIENTATION)) {
                return dir.getInt(ExifIFD0Directory.TAG_ORIENTATION);
            }
        } catch (Exception e) {
            // EXIF 없음/파싱 실패 시 정상 방향으로 간주
        }
        return 1;
    }

    /** 3(180도), 6(90도), 8(270도)만 보정. 좌우반전 태그(2,4,5,7)는 카메라 촬영본에서 사실상 나오지 않아 그대로 둔다. */
    public static BufferedImage applyOrientation(BufferedImage src, int orientation) {
        return switch (orientation) {
            case 3 -> rotate(src, 180);
            case 6 -> rotate(src, 90);
            case 8 -> rotate(src, 270);
            default -> src;
        };
    }

    /**
     * 이 방향값으로 {@link #applyOrientation}을 적용하면 가로/세로 치수가 서로 바뀌는지(90도 계열 회전).
     * 픽셀을 실제로 디코딩하지 않고 파일 헤더만으로 크기를 미리 계산해야 하는 호출부(예: 여러 이미지를
     * 합성하기 전 캔버스 크기를 정하는 {@code ImageCanvasUtil.detectMaxDimensions})가 방향 보정 후의
     * 실제 치수를 예측할 때 쓴다 — 안 그러면 회전된 프레임과 캔버스 크기가 어긋나 불필요한 레터박스가 생긴다.
     */
    public static boolean swapsDimensions(int orientation) {
        return orientation == 6 || orientation == 8;
    }

    private static BufferedImage rotate(BufferedImage src, int degrees) {
        int w = src.getWidth();
        int h = src.getHeight();
        boolean swap = degrees == 90 || degrees == 270;
        int newW = swap ? h : w;
        int newH = swap ? w : h;

        BufferedImage dst = new BufferedImage(newW, newH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = dst.createGraphics();
        AffineTransform at = new AffineTransform();
        at.translate(newW / 2.0, newH / 2.0);
        at.rotate(Math.toRadians(degrees));
        at.translate(-w / 2.0, -h / 2.0);
        g.drawImage(src, at, null);
        g.dispose();
        return dst;
    }
}
