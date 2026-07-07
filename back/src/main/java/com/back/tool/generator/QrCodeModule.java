package com.back.tool.generator;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Map;

@Component
public class QrCodeModule implements ToolModule {

    @Override
    public String getId() { return "qr-code"; }

    @Override
    public String getName() { return "QR코드 생성"; }

    @Override
    public String getCategory() { return "generator"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        try {
            String content = input.params().getOrDefault("content", "");
            int size = Integer.parseInt(input.params().getOrDefault("size", "300"));

            BitMatrix matrix = new QRCodeWriter().encode(
                    content, BarcodeFormat.QR_CODE, size, size,
                    Map.of(EncodeHintType.MARGIN, 1)
            );
            BufferedImage img = MatrixToImageWriter.toBufferedImage(matrix);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            return ToolResult.ofText(Base64.getEncoder().encodeToString(baos.toByteArray()));
        } catch (WriterException | IOException e) {
            throw new ToolProcessingException("QR코드 생성 실패: " + e.getMessage(), e);
        }
    }
}
