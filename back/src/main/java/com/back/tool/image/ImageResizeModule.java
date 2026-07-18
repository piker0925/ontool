package com.back.tool.image;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@Component
public class ImageResizeModule implements ToolModule {

    @Override
    public String getId() { return "image-resize"; }

    @Override
    public String getName() { return "이미지 리사이즈"; }

    @Override
    public String getCategory() { return "image"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        ToolParams params = ToolParams.of(input);
        String unit = params.getString("unit", "px");
        if (!unit.equals("px") && !unit.equals("%")) {
            throw new ToolProcessingException("파라미터 'unit'은 px 또는 %여야 합니다. (입력값: " + unit + ")");
        }
        boolean keepAspectRatio = params.getBool("keepAspectRatio", true);
        boolean preventUpscale = params.getBool("preventUpscale", true);
        int quality = params.getInt("quality", 85, 1, 100);

        Path src = input.files().get(0);
        try {
            BufferedImage srcImage = ImageIO.read(src.toFile());
            if (srcImage == null) {
                throw new ToolProcessingException("이미지 파일을 읽을 수 없습니다: " + src.getFileName());
            }
            int srcWidth = srcImage.getWidth();
            int srcHeight = srcImage.getHeight();

            int targetWidth;
            int targetHeight;
            if (unit.equals("%")) {
                int widthPercent = params.getInt("width", 100, 1, 500);
                int heightPercent = params.getInt("height", 100, 1, 500);
                targetWidth = Math.max(1, Math.round(srcWidth * widthPercent / 100f));
                targetHeight = Math.max(1, Math.round(srcHeight * heightPercent / 100f));
            } else {
                targetWidth = params.getInt("width", 800, 1, 20000);
                targetHeight = params.getInt("height", 600, 1, 20000);
            }
            // 확대 방지: 처리 후 경고만 하던 것과 달리, 애초에 원본보다 큰 축으로는 요청하지 못하게 막는다.
            if (preventUpscale) {
                targetWidth = Math.min(targetWidth, srcWidth);
                targetHeight = Math.min(targetHeight, srcHeight);
            }

            String ext = extension(src);
            Path output = Files.createTempFile("resize-", "." + ext);
            Thumbnails.Builder<BufferedImage> builder = Thumbnails.of(srcImage)
                    .size(targetWidth, targetHeight)
                    .keepAspectRatio(keepAspectRatio);
            if (ext.equals("jpg") || ext.equals("jpeg")) {
                builder.outputQuality(quality / 100f);
            }
            builder.toFile(output.toFile());

            String advisory = upscaleAdvisory(output, srcWidth, srcHeight);
            return new ToolResult(output, advisory);
        } catch (IOException e) {
            throw new ToolProcessingException("이미지 리사이즈 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 결과 이미지가 원본보다 커졌으면(업스케일) 경고 advisory를 반환한다. 아니면 null.
     * keepAspectRatio에 의해 요청 크기와 실제 결과 크기가 다를 수 있으므로 결과 파일 기준으로 판정한다.
     */
    private String upscaleAdvisory(Path output, int srcWidth, int srcHeight) throws IOException {
        BufferedImage out = ImageIO.read(output.toFile());
        if (out == null || (out.getWidth() <= srcWidth && out.getHeight() <= srcHeight)) {
            return null;
        }
        String advisory = "경고: 원본(" + srcWidth + "x" + srcHeight + ")보다 큰 "
                + out.getWidth() + "x" + out.getHeight() + "로 확대되어 품질이 저하될 수 있습니다.";
        log.warn("image-resize 업스케일: {}x{} -> {}x{}", srcWidth, srcHeight, out.getWidth(), out.getHeight());
        return advisory;
    }

    /**
     * 원본 확장자를 결과 포맷으로 그대로 쓰되, 쓰기 가능한 ImageIO 라이터가 없는 확장자
     * (예: WebP는 TwelveMonkeys에서 읽기만 지원)라면 무손실인 png로 대체한다.
     */
    private String extension(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        String ext = dot >= 0 ? name.substring(dot + 1).toLowerCase() : "png";
        return ImageIO.getImageWritersBySuffix(ext).hasNext() ? ext : "png";
    }
}
