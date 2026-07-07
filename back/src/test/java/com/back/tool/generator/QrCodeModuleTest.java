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

class QrCodeModuleTest {

    @Test
    void generatesValidBase64Png() throws Exception {
        QrCodeModule module = new QrCodeModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("content", "https://example.com")
        ));

        assertThat(result.isFile()).isFalse();
        assertThat(result.textResult()).isNotBlank();

        byte[] bytes = Base64.getDecoder().decode(result.textResult());
        BufferedImage img = ImageIO.read(new ByteArrayInputStream(bytes));
        assertThat(img).isNotNull();
        assertThat(img.getWidth()).isGreaterThan(0);
    }

    @Test
    void customSize() throws Exception {
        QrCodeModule module = new QrCodeModule();
        ToolResult result = module.process(new ToolInput(
                List.of(), Map.of("content", "hello", "size", "200")
        ));

        byte[] bytes = Base64.getDecoder().decode(result.textResult());
        BufferedImage img = ImageIO.read(new ByteArrayInputStream(bytes));
        assertThat(img.getWidth()).isEqualTo(200);
        assertThat(img.getHeight()).isEqualTo(200);
    }

    @Test
    void moduleMetadata() {
        QrCodeModule module = new QrCodeModule();
        assertThat(module.getId()).isEqualTo("qr-code");
        assertThat(module.isHeavy()).isFalse();
        assertThat(module.getCategory()).isEqualTo("generator");
    }
}
