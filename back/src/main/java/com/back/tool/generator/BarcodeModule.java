package com.back.tool.generator;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.oned.Code128Writer;
import com.google.zxing.oned.EAN13Writer;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
public class BarcodeModule implements ToolModule {

    /** 지원 바코드 형식. 프론트에서 format 파라미터로 전달된다 (code128 | ean13). */
    enum Format { CODE128, EAN13 }

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
        ToolParams params = ToolParams.of(input);
        String content = params.requireString("content");
        Format format = params.getEnum("format", Format.class, Format.CODE128);
        int width = params.getInt("width", 400, 50, 2000);
        int height = params.getInt("height", 120, 20, 1000);
        int foreground = params.getColor("foreground", "#000000").getRGB();
        int background = params.getColor("background", "#FFFFFF").getRGB();

        validateContent(format, content);

        try {
            BitMatrix matrix = switch (format) {
                case CODE128 -> new Code128Writer()
                        .encode(content, BarcodeFormat.CODE_128, width, height, Map.of());
                case EAN13 -> new EAN13Writer()
                        .encode(content, BarcodeFormat.EAN_13, width, height, Map.of());
            };
            return ToolResult.ofText(CodeImageSupport.toBase64Png(matrix, foreground, background));
        } catch (IllegalArgumentException | IOException e) {
            throw new ToolProcessingException("바코드 생성 실패: " + e.getMessage(), e);
        }
    }

    private void validateContent(Format format, String content) {
        if (format == Format.EAN13) {
            if (!content.matches("\\d{12,13}")) {
                throw new ToolProcessingException(
                        "EAN-13 바코드는 숫자 12~13자리여야 합니다. 12자리 입력 시 체크 디지트를 자동 계산합니다. (입력값: " + content + ")");
            }
            if (content.length() == 13) {
                int expected = ean13CheckDigit(content.substring(0, 12));
                int actual = content.charAt(12) - '0';
                if (expected != actual) {
                    throw new ToolProcessingException(
                            "EAN-13 체크 디지트가 올바르지 않습니다. 마지막 자리는 " + expected + "이어야 합니다. (입력값: " + content + ")");
                }
            }
        } else {
            for (int i = 0; i < content.length(); i++) {
                if (content.charAt(i) > 127) {
                    throw new ToolProcessingException(
                            "Code 128 바코드는 ASCII 문자(영문·숫자·기호)만 지원합니다. (허용되지 않는 문자: " + content.charAt(i) + ")");
                }
            }
        }
    }

    /** EAN-13 체크 디지트 계산: 앞 12자리 기준 (홀수 위치 ×1, 짝수 위치 ×3). */
    static int ean13CheckDigit(String digits12) {
        int sum = 0;
        for (int i = 0; i < 12; i++) {
            int d = digits12.charAt(i) - '0';
            sum += (i % 2 == 0) ? d : d * 3;
        }
        return (10 - sum % 10) % 10;
    }
}
