package com.back.tool.image;

import com.back.support.ExifJpegFixtures;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageCollageModuleTest {

    @TempDir
    Path tempDir;

    private final ImageCollageModule module = new ImageCollageModule();

    private Path createSolidImage(String name, Color color, int w, int h) throws Exception {
        Path p = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, w, h);
        g.dispose();
        ImageIO.write(img, "png", p.toFile());
        return p;
    }

    private Path createBandedImage(String name, int w, int h) throws Exception {
        Path p = tempDir.resolve(name);
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        Color[] bands = {Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW};
        for (int i = 0; i < 4; i++) {
            g.setColor(bands[i]);
            g.fillRect(i * (w / 4), 0, w / 4, h);
        }
        g.dispose();
        ImageIO.write(img, "png", p.toFile());
        return p;
    }

    private BufferedImage readResult(ToolResult result) throws Exception {
        return ImageIO.read(result.outputFile().toFile());
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("image-collage");
        assertThat(module.getCategory()).isEqualTo("image");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.acceptsMultipleFiles()).isTrue();
    }

    @Test
    void 이미지_1장만_업로드하면_최소_2장_필요_예외가_발생한다() throws Exception {
        List<Path> single = List.of(createSolidImage("only.png", Color.RED, 100, 100));

        assertThatThrownBy(() -> module.process(new ToolInput(single, Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("최소 2장");
    }

    @Test
    void 이미지_4장_columns_2면_2x2_격자로_순서와_위치가_대응한다() throws Exception {
        List<Path> images = List.of(
                createSolidImage("a.png", Color.RED, 100, 100),
                createSolidImage("b.png", Color.GREEN, 100, 100),
                createSolidImage("c.png", Color.BLUE, 100, 100),
                createSolidImage("d.png", Color.YELLOW, 100, 100));

        ToolResult result = module.process(new ToolInput(images, Map.of("columns", "2", "spacing", "0")));
        BufferedImage out = readResult(result);

        // 캔버스는 2열x2행, 셀 100x100, spacing=0 → 정확히 200x200
        assertThat(out.getWidth()).isEqualTo(200);
        assertThat(out.getHeight()).isEqualTo(200);

        // row-major 순서: a→(행0,열0), b→(행0,열1), c→(행1,열0), d→(행1,열1)
        // column-major였다면 b와 c 위치가 뒤바뀌어 이 assertion들이 깨진다.
        assertThat(new Color(out.getRGB(50, 50))).isEqualTo(Color.RED);
        assertThat(new Color(out.getRGB(150, 50))).isEqualTo(Color.GREEN);
        assertThat(new Color(out.getRGB(50, 150))).isEqualTo(Color.BLUE);
        assertThat(new Color(out.getRGB(150, 150))).isEqualTo(Color.YELLOW);
    }

    @Test
    void 크기가_다른_이미지는_잘리거나_늘어나지_않고_비율유지_레터박스로_처리된다() throws Exception {
        // wide(200x100, 세로 밴드 4개)가 전체 중 최대 크기라 셀 크기(200x100)를 결정한다 → 정확히 맞아 패딩 없음.
        // small(160x40, 세로 밴드 4개)은 종횡비가 달라 실제로 스케일(가로 기준 1.25배)되어야 한다 —
        // 두 이미지 모두 scale=1(패딩 없음)이 되면 리사이즈 산술 자체가 검증되지 않으므로
        // 의도적으로 작고 비율이 다른 이미지를 사용해 실제 축소/확대 경로를 통과시킨다.
        Path wide = createBandedImage("wide.png", 200, 100);
        Path small = createBandedImage("small.png", 160, 40);

        ToolResult result = module.process(new ToolInput(List.of(wide, small),
                Map.of("columns", "2", "spacing", "0")));
        BufferedImage out = readResult(result);

        // 캔버스 = 2열 x 200(cellWidth) x 1행 x 100(cellHeight), spacing=0
        assertThat(out.getWidth()).isEqualTo(400);
        assertThat(out.getHeight()).isEqualTo(100);

        // 셀0(wide, 200x100)은 셀 크기와 정확히 일치 → 패딩 없이 4개 밴드 그대로 보존 (크롭 아님)
        assertThat(new Color(out.getRGB(25, 50))).isEqualTo(Color.RED);
        assertThat(new Color(out.getRGB(75, 50))).isEqualTo(Color.GREEN);
        assertThat(new Color(out.getRGB(125, 50))).isEqualTo(Color.BLUE);
        assertThat(new Color(out.getRGB(175, 50))).isEqualTo(Color.YELLOW);

        // 셀1(small, 160x40 → scale=min(200/160, 100/40)=1.25배로 200x50까지 확대, 가로는 꽉 채움)
        // 스케일 후 밴드 경계는 0,50,100,150,200(전역 x는 +200 셀 오프셋) → 각 밴드 중심에서 원본 색상·순서가
        // 그대로 보존돼야 한다 (스트레치·크롭이었다면 밴드 폭이나 순서가 달라져 이 assertion들이 깨진다).
        assertThat(new Color(out.getRGB(225, 50))).isEqualTo(Color.RED);
        assertThat(new Color(out.getRGB(275, 50))).isEqualTo(Color.GREEN);
        assertThat(new Color(out.getRGB(325, 50))).isEqualTo(Color.BLUE);
        assertThat(new Color(out.getRGB(375, 50))).isEqualTo(Color.YELLOW);

        // 세로축은 40px→50px로만 확대되어 셀 높이(100)를 못 채움 → 위/아래에 배경색(흰색) 여백이 남는다
        // (늘려서(stretch) 꽉 채웠다면 이 여백이 사라져 아래 assertion이 깨진다)
        assertThat(new Color(out.getRGB(300, 10))).isEqualTo(Color.WHITE);
        assertThat(new Color(out.getRGB(300, 90))).isEqualTo(Color.WHITE);
    }

    @Test
    void exif_Orientation가_있는_이미지는_콜라주_합성_전에_방향이_보정되고_프레임별로_독립적으로_적용된다() throws Exception {
        // 116 재현: 콜라주는 여러 장을 합성하므로 프레임별로 방향이 제각각인 경우도 각자 독립적으로
        // 보정돼야 한다 — 정사각형(40x40) 원본을 써서 회전해도 셀 크기(detectMaxDimensions 기준)와
        // 어긋나지 않게 한다.
        Path rotated = ExifJpegFixtures.createJpegWithOrientation(
                tempDir, "rotated.jpg", ExifJpegFixtures.asymmetricImage(40, 40), 6);
        Path normal = tempDir.resolve("normal.jpg");
        ImageIO.write(ExifJpegFixtures.asymmetricImage(40, 40), "jpg", normal.toFile());

        ToolResult result = module.process(new ToolInput(List.of(rotated, normal),
                Map.of("columns", "2", "spacing", "0")));
        BufferedImage out = readResult(result);

        assertThat(out.getWidth()).isEqualTo(80);
        assertThat(out.getHeight()).isEqualTo(40);

        // 셀0(orientation=6): 90도 보정 후 빨강 사분면이 우상단으로 이동해야 한다
        assertThat(ExifJpegFixtures.isRed(out.getRGB(36, 2))).isTrue();
        assertThat(ExifJpegFixtures.isRed(out.getRGB(2, 2))).isFalse();

        // 셀1(EXIF 없음, 전역 x는 +40 오프셋): 그대로 좌상단이 빨강이어야 한다 — 회귀 없음 확인
        assertThat(ExifJpegFixtures.isRed(out.getRGB(42, 2))).isTrue();
    }

    @Test
    void 자동_셀_크기_계산도_EXIF로_보정된_치수를_기준으로_한다() throws Exception {
        // 116 후속: detectMaxDimensions가 헤더의 raw 픽셀 크기(방향 보정 전)만 보고 셀 크기를 정하면,
        // 보정 후 실제로 그려지는 프레임(세로 20x40)과 셀 크기가 어긋나 불필요한 레터박스가 생긴다.
        // raw 기준(40x20)이었다면 캔버스는 80x40, 보정된 기준(20x40)이면 40x40이 되어야 한다.
        Path rotated = ExifJpegFixtures.createJpegWithOrientation(
                tempDir, "rotated.jpg", ExifJpegFixtures.asymmetricImage(40, 20), 6);
        Path normal = createSolidImage("normal.png", Color.RED, 20, 40); // 보정된 rotated와 같은 치수

        ToolResult result = module.process(new ToolInput(List.of(rotated, normal),
                Map.of("columns", "2", "spacing", "0")));
        BufferedImage out = readResult(result);

        assertThat(out.getWidth()).isEqualTo(40);
        assertThat(out.getHeight()).isEqualTo(40);
    }

    @Test
    void spacing_값에_따라_캔버스_크기와_셀_간격이_실제로_달라진다() throws Exception {
        List<Path> images = List.of(
                createSolidImage("left.png", Color.RED, 50, 50),
                createSolidImage("right.png", Color.BLUE, 50, 50));

        ToolResult noSpacing = module.process(new ToolInput(images,
                Map.of("columns", "2", "spacing", "0")));
        ToolResult withSpacing = module.process(new ToolInput(images,
                Map.of("columns", "2", "spacing", "10", "backgroundColor", "#000000")));

        BufferedImage flush = readResult(noSpacing);
        BufferedImage spaced = readResult(withSpacing);

        // spacing=0: 2셀(50x50) 붙어서 정확히 100x50
        assertThat(flush.getWidth()).isEqualTo(100);
        assertThat(flush.getHeight()).isEqualTo(50);

        // spacing=10: 바깥 테두리 포함 (columns+1)*spacing=30, (rows+1)*spacing=20 → 130x70
        assertThat(spaced.getWidth()).isEqualTo(130);
        assertThat(spaced.getHeight()).isEqualTo(70);

        // 셀 사이 간격(전역 x=65, 두 셀 사이) 픽셀은 지정한 backgroundColor(검정)
        assertThat(new Color(spaced.getRGB(65, 35))).isEqualTo(Color.BLACK);
        // 바깥 여백(전역 x=5)도 backgroundColor
        assertThat(new Color(spaced.getRGB(5, 35))).isEqualTo(Color.BLACK);
        // 셀 내용은 여전히 원본 색상 유지 (좌: red 셀 중앙, 우: blue 셀 중앙)
        assertThat(new Color(spaced.getRGB(35, 35))).isEqualTo(Color.RED);
        assertThat(new Color(spaced.getRGB(95, 35))).isEqualTo(Color.BLUE);
    }
}
