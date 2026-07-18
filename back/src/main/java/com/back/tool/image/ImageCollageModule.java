package com.back.tool.image;

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
