package com.back.tool.document;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OfficeDocumentConvertModuleTest {

    @TempDir
    Path tempDir;

    private final LibreOfficeConvertSupport libreOffice = new LibreOfficeConvertSupport("soffice");
    private final OfficeDocumentConvertModule module = new OfficeDocumentConvertModule(libreOffice);

    private Path sample(String name) {
        return Path.of("src/test/resources/samples/" + name);
    }

    private String extractText(Path pdf) throws IOException {
        try (PDDocument doc = PDDocument.load(pdf.toFile())) {
            return new PDFTextStripper().getText(doc);
        }
    }

    @Test
    void HWP_파일을_PDF로_변환하면_원본_텍스트가_보존된다() throws Exception {
        ToolResult result = module.process(new ToolInput(List.of(sample("test.hwp")), Map.of()));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile().getFileName().toString()).endsWith(".pdf");
        // 픽스처의 실제 내용(사전에 독립 검증된 기준값)과 대조 — 파일 존재/크기만 보는 얕은 검증 금지.
        String text = extractText(result.outputFile());
        assertThat(text).contains("이것은 원본 HWP 파일의 내용입니다");
        assertThat(text).contains("ABC");
        assertThat(text).contains("123");
    }

    @Test
    void HWPX_파일을_PDF로_변환하면_원본_텍스트가_보존된다() throws Exception {
        ToolResult result = module.process(new ToolInput(List.of(sample("test.hwpx")), Map.of()));

        assertThat(result.isFile()).isTrue();
        assertThat(result.outputFile().getFileName().toString()).endsWith(".pdf");
        String text = extractText(result.outputFile());
        assertThat(text).contains("어썸킴");
        assertThat(text).contains("김하성");
        assertThat(text).contains("샌디에이고");
    }

    @Test
    void PPTX_파일을_PDF로_변환하면_원본_텍스트가_보존된다() throws Exception {
        ToolResult result = module.process(new ToolInput(List.of(sample("test.pptx")), Map.of()));

        assertThat(result.isFile()).isTrue();
        String text = extractText(result.outputFile());
        assertThat(text).contains("DevToolbox 테스트 슬라이드");
        assertThat(text).contains("두 번째 줄 텍스트");
    }

    @Test
    void 레거시_PPT_파일을_PDF로_변환하면_원본_텍스트가_보존된다() throws Exception {
        ToolResult result = module.process(new ToolInput(List.of(sample("test.ppt")), Map.of()));

        assertThat(result.isFile()).isTrue();
        String text = extractText(result.outputFile());
        assertThat(text).contains("DevToolbox 테스트 슬라이드");
    }

    @Test
    void 레거시_DOC_파일을_PDF로_변환하면_원본_텍스트가_보존된다() throws Exception {
        ToolResult result = module.process(new ToolInput(List.of(sample("test.doc")), Map.of()));

        assertThat(result.isFile()).isTrue();
        String text = extractText(result.outputFile());
        assertThat(text).contains("DevToolbox 테스트 문서");
        assertThat(text).contains("두 번째 문단 ABC 123");
    }

    @Test
    void 레거시_XLS_파일을_PDF로_변환하면_원본_텍스트가_보존된다() throws Exception {
        ToolResult result = module.process(new ToolInput(List.of(sample("test.xls")), Map.of()));

        assertThat(result.isFile()).isTrue();
        String text = extractText(result.outputFile());
        assertThat(text).contains("이름");
        assertThat(text).contains("테스트");
        assertThat(text).contains("123");
    }

    // LibreOffice는 내용이 깨진 파일(순수 랜덤 바이트 포함)도 텍스트로 강제 해석해 "성공"으로 변환한다
    // (베타 라벨의 근거 — 실패하지 않고 저품질 결과를 낼 수 있음). 실제로 변환이 실패하는 경계는
    // 입력 파일 자체를 읽을 수 없는 경우다.
    @Test
    void 입력_파일을_읽을_수_없으면_명확한_에러를_던진다() throws Exception {
        Path missing = tempDir.resolve("does-not-exist.hwp");

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(missing), Map.of())))
                .isInstanceOf(ToolProcessingException.class);
    }

    @Test
    void 동시_변환_요청_두_건이_프로필_충돌_없이_각각_성공한다() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<ToolResult>> futures = IntStream.range(0, 2)
                    .mapToObj(i -> pool.submit(() ->
                            module.process(new ToolInput(List.of(sample("test.hwp")), Map.of()))))
                    .toList();

            for (Future<ToolResult> future : futures) {
                ToolResult result = future.get();
                assertThat(result.isFile()).isTrue();
                assertThat(extractText(result.outputFile())).contains("ABC");
            }
        } finally {
            pool.shutdown();
        }
    }
}
