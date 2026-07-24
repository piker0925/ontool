package com.back.tool.watermark;

import com.back.tool.model.ToolParams;

/**
 * 워터마크 이미지의 퍼센트 좌표 한 쌍(129) — {@code imageXPercent}/{@code imageYPercent}는 항상
 * 같이 다니는 값이라(둘 다 없거나, 둘 다 있거나) 프론트의 {@code WatermarkImagePosition}과 대칭되는
 * 백엔드 쪽 타입으로 묶는다. 둘 중 하나라도 생략되면(구버전 호출 등) 해당 축은 {@code null}이 되어
 * {@link WatermarkPlacement}의 {@code resolve*} 메서드가 레거시 우하단으로 폴백하게 한다.
 */
public record ImagePercentPosition(Double xPercent, Double yPercent) {

    public static ImagePercentPosition of(ToolParams params) {
        return new ImagePercentPosition(
                params.getOptionalDouble("imageXPercent", 0, 100),
                params.getOptionalDouble("imageYPercent", 0, 100));
    }
}
