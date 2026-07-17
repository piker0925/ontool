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
