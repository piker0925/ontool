package com.back.tool.generator;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.oned.Code128Writer;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Map;

@Component
public class BarcodeModule implements ToolModule {

    @Override
    public String getId() { return "barcode"; }

    @Override
    public String getName() { return "바코드 생성"; }

    @Override
    public String getCategory() { return "generator"; }

    @Override
    public boolean isHeavy() { return false; }

    @Override
    public ToolResult process(ToolInput input) {
        try {
            String content = input.params().getOrDefault("content", "");
            int width = Integer.parseInt(input.params().getOrDefault("width", "400"));
            int height = Integer.parseInt(input.params().getOrDefault("height", "120"));

            BitMatrix matrix = new Code128Writer().encode(
                    content, BarcodeFormat.CODE_128, width, height, Map.of()
            );
            BufferedImage img = MatrixToImageWriter.toBufferedImage(matrix);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            return ToolResult.ofText(Base64.getEncoder().encodeToString(baos.toByteArray()));
        } catch (IOException e) {
            throw new ToolProcessingException("바코드 생성 실패: " + e.getMessage(), e);
        }
    }
}
