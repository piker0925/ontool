package com.back.tool.image;

import com.back.global.util.ExifOrientationSupport;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Component
public class ImageCollageModule implements ToolModule {

    @Override
    public String getId() { return "image-collage"; }

    @Override
    public String getName() { return "이미지 콜라주"; }

    @Override
    public String getCategory() { return "image"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public boolean acceptsMultipleFiles() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        List<Path> files = input.files();
        if (files.size() < 2) {
            throw new ToolProcessingException(
                    "콜라주는 최소 2장의 이미지가 필요합니다. (현재 " + files.size() + "장)");
        }

        ToolParams params = ToolParams.of(input);
        int columns = params.getInt("columns", 2, 1, 50);
        int spacing = params.getInt("spacing", 0, 0, 500);
        Color backgroundColor = params.getColor("backgroundColor", "#FFFFFF");

        int rows = (int) Math.ceil(files.size() / (double) columns);

        try {
            int[] maxSize = ImageCanvasUtil.detectMaxDimensions(files);
            int cellWidth = maxSize[0];
            int cellHeight = maxSize[1];

            int canvasWidth = columns * cellWidth + (columns + 1) * spacing;
            int canvasHeight = rows * cellHeight + (rows + 1) * spacing;

            BufferedImage canvas = new BufferedImage(canvasWidth, canvasHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = canvas.createGraphics();
            g.setColor(backgroundColor);
            g.fillRect(0, 0, canvasWidth, canvasHeight);

            for (int i = 0; i < files.size(); i++) {
                int row = i / columns;
                int col = i % columns;

                BufferedImage source = ImageIO.read(files.get(i).toFile());
                if (source == null) {
                    throw new ToolProcessingException("이미지 파일을 읽을 수 없습니다: " + files.get(i).getFileName());
                }
                // 폰카메라 등은 픽셀은 그대로 두고 EXIF Orientation 태그로만 회전 방향을 표시하는데,
                // ImageIO 리더는 이 태그를 무시하므로 직접 보정하지 않으면 결과물이 옆으로 눕거나 뒤집힌다.
                // 프레임마다 방향이 제각각일 수 있으므로 각 프레임 독립적으로 보정한다.
                int orientation = ExifOrientationSupport.readOrientation(files.get(i));
                source = ExifOrientationSupport.applyOrientation(source, orientation);
                BufferedImage cell = ImageCanvasUtil.containPad(source, cellWidth, cellHeight, backgroundColor);

                int x = spacing + col * (cellWidth + spacing);
                int y = spacing + row * (cellHeight + spacing);
                g.drawImage(cell, x, y, null);
            }
            g.dispose();

            Path output = Files.createTempFile("collage-", ".png");
            ImageIO.write(canvas, "png", output.toFile());
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("이미지 콜라주 생성 실패: " + e.getMessage(), e);
        }
    }
}
