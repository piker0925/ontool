package com.back.tool.image;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * JPEG의 EXIF(APP1) 메타데이터 세그먼트만 바이트 단위로 잘라내어 제거한다.
 * ImageIO로 디코드·재인코드하지 않으므로 픽셀 데이터(SOF/DQT/DHT/SOS 이후 엔트로피 코딩 구간)는
 * 원본과 완전히 동일하게 유지된다 — 재압축에 의한 화질 손실이 없는 진짜 무손실 제거.
 */
@Component
public class ExifRemoveModule implements ToolModule {

    private static final byte[] EXIF_IDENTIFIER = "Exif\0\0".getBytes(StandardCharsets.US_ASCII);
    private static final int SOI = 0xD8;
    private static final int EOI = 0xD9;
    private static final int SOS = 0xDA;
    private static final int APP1 = 0xE1;

    @Override
    public String getId() { return "exif-remove"; }

    @Override
    public String getName() { return "EXIF 제거"; }

    @Override
    public String getCategory() { return "image"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        Path src = input.files().get(0);
        byte[] original;
        try {
            original = Files.readAllBytes(src);
        } catch (IOException e) {
            throw new ToolProcessingException("파일을 읽을 수 없습니다: " + e.getMessage(), e);
        }

        byte[] stripped = stripJpegExif(original, src);

        try {
            Path output = Files.createTempFile("exifrm-", ".jpg");
            Files.write(output, stripped);
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("결과 파일 저장 실패: " + e.getMessage(), e);
        }
    }

    /**
     * JPEG 마커 세그먼트를 순회하며 EXIF APP1(식별자 "Exif\0\0")만 건너뛰고 나머지는 바이트 그대로 복사한다.
     * SOS(엔트로피 코딩 시작) 마커를 만나면 그 뒤로는 세그먼트 파싱을 멈추고 파일 끝까지 통째로 복사한다 —
     * 스캔 데이터 내부의 0xFF 바이트는 바이트 스터핑·재시작 마커라 세그먼트 마커와 구분할 수 없기 때문이다.
     * 이 방식은 (fill byte 없는) 표준 JPEG 헤더 구조를 전제한다.
     */
    private byte[] stripJpegExif(byte[] jpeg, Path src) {
        if (jpeg.length < 4 || (jpeg[0] & 0xFF) != 0xFF || (jpeg[1] & 0xFF) != SOI) {
            throw new ToolProcessingException(
                    "지원하지 않는 파일 형식입니다. 현재 JPEG 파일만 지원합니다: " + src.getFileName());
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream(jpeg.length);
        out.write(jpeg[0]);
        out.write(jpeg[1]);
        int i = 2;

        while (i < jpeg.length) {
            if ((jpeg[i] & 0xFF) != 0xFF || i + 1 >= jpeg.length) {
                // 마커 구조가 깨졌으면 더는 해석하지 않고 나머지를 그대로 복사한다 (안전한 폴백)
                out.write(jpeg, i, jpeg.length - i);
                break;
            }
            int marker = jpeg[i + 1] & 0xFF;

            if (marker == EOI) {
                out.write(jpeg, i, 2);
                i += 2;
                continue;
            }
            if (marker == SOS) {
                out.write(jpeg, i, jpeg.length - i);
                i = jpeg.length;
                break;
            }
            if (i + 3 >= jpeg.length) {
                out.write(jpeg, i, jpeg.length - i);
                break;
            }

            int segLen = ((jpeg[i + 2] & 0xFF) << 8) | (jpeg[i + 3] & 0xFF);
            int segTotal = 2 + segLen; // 마커(2) + 길이 필드가 가리키는 길이(길이 필드 자신 포함)
            if (segTotal < 2 || i + segTotal > jpeg.length) {
                // 손상된 길이 필드 — 더는 해석하지 않고 그대로 복사
                out.write(jpeg, i, jpeg.length - i);
                break;
            }

            boolean isExifApp1 = marker == APP1
                    && segLen >= 2 + EXIF_IDENTIFIER.length
                    && matches(jpeg, i + 4, EXIF_IDENTIFIER);
            if (!isExifApp1) {
                out.write(jpeg, i, segTotal);
            }
            i += segTotal;
        }

        return out.toByteArray();
    }

    private boolean matches(byte[] data, int offset, byte[] needle) {
        if (offset + needle.length > data.length) return false;
        for (int k = 0; k < needle.length; k++) {
            if (data[offset + k] != needle[k]) return false;
        }
        return true;
    }
}
