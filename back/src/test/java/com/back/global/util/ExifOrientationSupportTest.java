package com.back.global.util;

import org.junit.jupiter.api.Test;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;

import static org.assertj.core.api.Assertions.assertThat;

class ExifOrientationSupportTest {

    // 좌상단 사분면만 빨강, 나머지는 파랑 — 회전 "방향"이 실제로 맞는지 확인하기 위한 비대칭 이미지
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

    @Test
    void orientationOneReturnsSameImageUnchanged() {
        BufferedImage src = asymmetricImage(40, 20);

        BufferedImage result = ExifOrientationSupport.applyOrientation(src, 1);

        assertThat(result).isSameAs(src);
    }

    @Test
    void orientation6RotatesClockwiseAndSwapsDimensions() {
        BufferedImage src = asymmetricImage(40, 20); // 빨강: 좌상단

        BufferedImage result = ExifOrientationSupport.applyOrientation(src, 6);

        assertThat(result.getWidth()).isEqualTo(20);
        assertThat(result.getHeight()).isEqualTo(40);
        // 90도 회전 후 빨강 사분면은 우상단으로 이동해야 한다
        assertThat(isRed(result.getRGB(result.getWidth() - 2, 2))).isTrue();
        assertThat(isRed(result.getRGB(2, 2))).isFalse();
    }

    @Test
    void orientation8RotatesCounterClockwiseAndSwapsDimensions() {
        BufferedImage src = asymmetricImage(40, 20); // 빨강: 좌상단

        BufferedImage result = ExifOrientationSupport.applyOrientation(src, 8);

        assertThat(result.getWidth()).isEqualTo(20);
        assertThat(result.getHeight()).isEqualTo(40);
        // 270도 회전 후 빨강 사분면은 좌하단으로 이동해야 한다
        assertThat(isRed(result.getRGB(2, result.getHeight() - 2))).isTrue();
        assertThat(isRed(result.getRGB(2, 2))).isFalse();
    }

    @Test
    void orientation3Rotates180DegreesKeepingDimensions() {
        BufferedImage src = asymmetricImage(40, 20); // 빨강: 좌상단

        BufferedImage result = ExifOrientationSupport.applyOrientation(src, 3);

        assertThat(result.getWidth()).isEqualTo(40);
        assertThat(result.getHeight()).isEqualTo(20);
        // 180도 회전 후 빨강 사분면은 우하단으로 이동해야 한다
        assertThat(isRed(result.getRGB(result.getWidth() - 2, result.getHeight() - 2))).isTrue();
        assertThat(isRed(result.getRGB(2, 2))).isFalse();
    }

    @Test
    void readOrientationReturnsOneWhenNoExifPresent(@org.junit.jupiter.api.io.TempDir java.nio.file.Path tempDir) throws Exception {
        java.nio.file.Path imgPath = tempDir.resolve("no-exif.png");
        javax.imageio.ImageIO.write(asymmetricImage(10, 10), "png", imgPath.toFile());

        assertThat(ExifOrientationSupport.readOrientation(imgPath)).isEqualTo(1);
    }
}
