package com.back.tool.image;

import com.back.tool.model.ToolProcessingException;
import net.coobird.thumbnailator.Thumbnails;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

/**
 * "최대 크기 캔버스 + 여백 패딩(contain-pad)" 기법의 공용 구현.
 * {@link GifModule}, {@link ImageCollageModule}이 여러 이미지의 크기를 하나로 통일할 때 공유한다.
 */
final class ImageCanvasUtil {

    private ImageCanvasUtil() {
    }

    /** 전체 이미지 중 가로·세로 각각의 최댓값을 헤더만 읽어 파악한다 (풀 디코딩 없이 크기 결정). */
    static int[] detectMaxDimensions(List<Path> files) throws IOException {
        int maxWidth = 0;
        int maxHeight = 0;
        for (Path path : files) {
            try (ImageInputStream iis = ImageIO.createImageInputStream(path.toFile())) {
                if (iis == null) {
                    throw new ToolProcessingException("이미지 파일을 읽을 수 없습니다: " + path.getFileName());
                }
                var readers = ImageIO.getImageReaders(iis);
                if (!readers.hasNext()) {
                    throw new ToolProcessingException("이미지 파일을 읽을 수 없습니다: " + path.getFileName());
                }
                ImageReader reader = readers.next();
                try {
                    reader.setInput(iis);
                    maxWidth = Math.max(maxWidth, reader.getWidth(0));
                    maxHeight = Math.max(maxHeight, reader.getHeight(0));
                } finally {
                    reader.dispose();
                }
            }
        }
        return new int[]{maxWidth, maxHeight};
    }

    /**
     * 원본 전체가 보이도록 대상 크기 안에 맞춰 축소·확대(비율 유지) 후 중앙에 배치하고,
     * 남는 여백은 지정한 배경색으로 채운다 (CSS object-fit: contain과 동일). 자르지 않으므로
     * 원본 비율이 제각각이어도 내용 손실 없이 크기를 통일할 수 있다.
     */
    static BufferedImage containPad(BufferedImage source, int targetWidth, int targetHeight,
                                     Color backgroundColor) throws IOException {
        if (source.getWidth() == targetWidth && source.getHeight() == targetHeight) return source;

        double scale = Math.min(targetWidth / (double) source.getWidth(), targetHeight / (double) source.getHeight());
        int scaledWidth = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int scaledHeight = Math.max(1, (int) Math.round(source.getHeight() * scale));
        BufferedImage scaled = (scaledWidth == source.getWidth() && scaledHeight == source.getHeight())
                ? source
                : Thumbnails.of(source).forceSize(scaledWidth, scaledHeight).asBufferedImage();

        BufferedImage padded = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = padded.createGraphics();
        g.setColor(backgroundColor);
        g.fillRect(0, 0, targetWidth, targetHeight);
        g.drawImage(scaled, (targetWidth - scaledWidth) / 2, (targetHeight - scaledHeight) / 2, null);
        g.dispose();
        return padded;
    }
}
