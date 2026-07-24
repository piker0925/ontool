package com.back.tool.watermark;

import com.back.tool.model.ToolParams;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ImagePercentPositionTest {

    @Test
    void of_readsBothPercentParamsFromToolParams() {
        ToolParams params = new ToolParams(Map.of("imageXPercent", "12.5", "imageYPercent", "67.5"));

        ImagePercentPosition position = ImagePercentPosition.of(params);

        assertThat(position.xPercent()).isEqualTo(12.5);
        assertThat(position.yPercent()).isEqualTo(67.5);
    }

    @Test
    void of_missingParams_bothNull() {
        ImagePercentPosition position = ImagePercentPosition.of(new ToolParams(Map.of()));

        assertThat(position.xPercent()).isNull();
        assertThat(position.yPercent()).isNull();
    }
}
