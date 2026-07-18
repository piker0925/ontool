package com.back.tool.generator;

import com.google.zxing.client.j2se.MatrixToImageConfig;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

/**
 * QR/바코드 모듈 공용 이미지 렌더링 헬퍼.
 * BitMatrix → Base64 PNG 변환을 담당한다.
 */
final class CodeImageSupport {

    private CodeImageSupport() {
    }

    static String toBase64Png(BitMatrix matrix, int onColor, int offColor) throws IOException {
        BufferedImage img = MatrixToImageWriter.toBufferedImage(
                matrix, new MatrixToImageConfig(onColor, offColor));
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        return Base64.getEncoder().encodeToString(baos.toByteArray());
    }
}
