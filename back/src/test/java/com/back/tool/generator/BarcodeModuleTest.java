package com.back.tool.generator;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BarcodeModuleTest {

    @Test
    void generatesValidBase64Png() throws Exception {
        BarcodeModule module = new BarcodeModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("content", "1234567890")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).isNotBlank();

        byte[] bytes = Base64.getDecoder().decode(result.textResult());
        BufferedImage img = ImageIO.read(new ByteArrayInputStream(bytes));
        assertThat(img).isNotNull();
        assertThat(img.getWidth()).isGreaterThan(0);
    }

    @Test
    void moduleMetadata() {
        BarcodeModule module = new BarcodeModule();
        assertThat(module.getId()).isEqualTo("barcode");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("generator");
    }
}
