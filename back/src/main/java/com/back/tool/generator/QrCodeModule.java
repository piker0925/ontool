package com.back.tool.generator;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Component;

import java.io.IOException;
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
        ToolParams params = ToolParams.of(input);
        String content = params.requireString("content");
        int size = params.getInt("size", 300, 64, 2048);
        int margin = params.getInt("margin", 4, 0, 10);
        ErrorCorrectionLevel level =
                params.getEnum("errorCorrection", ErrorCorrectionLevel.class, ErrorCorrectionLevel.M);
        int foreground = params.getColor("foreground", "#000000").getRGB();
        int background = params.getColor("background", "#FFFFFF").getRGB();

        try {
            BitMatrix matrix = new QRCodeWriter().encode(
                    content, BarcodeFormat.QR_CODE, size, size,
                    Map.of(
                            EncodeHintType.MARGIN, margin,
                            EncodeHintType.ERROR_CORRECTION, level
                    )
            );
            return ToolResult.ofText(CodeImageSupport.toBase64Png(matrix, foreground, background));
        } catch (WriterException | IOException e) {
            throw new ToolProcessingException("QR코드 생성 실패: " + e.getMessage(), e);
        }
    }
}
