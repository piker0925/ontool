package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class InvoiceGeneratorModuleTest {

    private final InvoiceGeneratorModule module = new InvoiceGeneratorModule();

    private ToolResult process(String invoiceJson) {
        return module.process(new ToolInput(List.of(), Map.of("invoiceJson", invoiceJson)));
    }

    @Test
    void 인보이스_품목_수량_단가_합계가_PDF_텍스트에_모두_포함되고_합계는_품목합과_일치한다() throws Exception {
        // 품목 2개, 서로 다른 수량·단가 — 소계(200.00 / 30.00)가 섞여도 합계(230.00)가 정확히 나오는지 검증한다.
        String invoiceJson = """
                {
                  "issuer": "ACME 주식회사",
                  "issuerAddress": "서울시 강남구",
                  "recipient": "Foo Corp",
                  "recipientAddress": "부산시 해운대구",
                  "invoiceNumber": "INV-2026-001",
                  "issueDate": "2026-07-18",
                  "items": [
                    {"description": "Widget", "quantity": 2, "unitPrice": 100.00},
                    {"description": "Gadget", "quantity": 3, "unitPrice": 10.00}
                  ]
                }
                """;

        ToolResult result = process(invoiceJson);

        assertThat(result.isFile()).isTrue();
        try (PDDocument doc = PDDocument.load(result.outputFile().toFile())) {
            String text = new PDFTextStripper().getText(doc);

            // 발행자·수신자
            assertThat(text).contains("ACME 주식회사", "서울시 강남구", "Foo Corp", "부산시 해운대구", "INV-2026-001", "2026-07-18");
            // 품목명
            assertThat(text).contains("Widget", "Gadget");
            // 수량
            assertThat(text).contains("2", "3");
            // 단가(개별)
            assertThat(text).contains("100.00", "10.00");
            // 소계(수량×단가): 2*100=200.00, 3*10=30.00
            assertThat(text).contains("200.00", "30.00");
            // 합계 = 200.00 + 30.00 = 230.00 (독립적으로 계산한 기준값과 비교 — 화면에 숫자가 있다는 것만 보지 않는다)
            assertThat(text).contains("230.00");
        }
    }

    @Test
    void 품목이_하나_더_추가되면_합계도_그만큼_증가한다() throws Exception {
        // 패턴 B: 품목 2개 대비 3개 케이스를 비교해 "합계가 실제로 재계산됨"을 구분한다(고정값 출력 버그 방지).
        String twoItems = """
                {
                  "issuer": "A", "recipient": "B",
                  "items": [
                    {"description": "X", "quantity": 1, "unitPrice": 100.00},
                    {"description": "Y", "quantity": 1, "unitPrice": 50.00}
                  ]
                }
                """;
        String threeItems = """
                {
                  "issuer": "A", "recipient": "B",
                  "items": [
                    {"description": "X", "quantity": 1, "unitPrice": 100.00},
                    {"description": "Y", "quantity": 1, "unitPrice": 50.00},
                    {"description": "Z", "quantity": 1, "unitPrice": 25.00}
                  ]
                }
                """;

        ToolResult two = process(twoItems);
        ToolResult three = process(threeItems);

        try (PDDocument twoDoc = PDDocument.load(two.outputFile().toFile());
             PDDocument threeDoc = PDDocument.load(three.outputFile().toFile())) {
            String twoText = new PDFTextStripper().getText(twoDoc);
            String threeText = new PDFTextStripper().getText(threeDoc);

            assertThat(twoText).contains("150.00");
            assertThat(twoText).doesNotContain("175.00");

            assertThat(threeText).contains("175.00");
        }
    }

    @Test
    void invoiceJson_파라미터가_없으면_명확한_에러를_던진다() {
        assertThatThrownBy(() -> module.process(new ToolInput(List.of(), Map.of())))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("invoiceJson");
    }

    @Test
    void invoiceJson이_빈_문자열이면_명확한_에러를_던진다() {
        assertThatThrownBy(() -> process("   "))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("invoiceJson");
    }

    @Test
    void invoiceJson이_잘못된_형식이면_명확한_에러를_던진다() {
        assertThatThrownBy(() -> process("{ this is not valid json"))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("형식이 올바르지 않습니다");
    }

    @Test
    void 품목이_비어있으면_명확한_에러를_던진다() {
        String invoiceJson = """
                {"issuer": "A", "recipient": "B", "items": []}
                """;

        assertThatThrownBy(() -> process(invoiceJson))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("품목");
    }

    @Test
    void 발행자가_없으면_명확한_에러를_던진다() {
        String invoiceJson = """
                {"recipient": "B", "items": [{"description": "X", "quantity": 1, "unitPrice": 1}]}
                """;

        assertThatThrownBy(() -> process(invoiceJson))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("발행자");
    }

    @Test
    void paperSize를_Letter로_지정하면_결과_PDF의_실제_페이지_크기가_Letter로_바뀐다() throws Exception {
        // 패턴 A+B: 기본(A4)과 Letter 두 시나리오 — 존재 확인이 아니라 실제 MediaBox 크기를 기준값과 비교한다.
        String invoiceJson = """
                {"issuer": "A", "recipient": "B", "items": [{"description": "X", "quantity": 1, "unitPrice": 10}]}
                """;

        ToolResult a4 = process(invoiceJson);
        ToolResult letter = module.process(new ToolInput(List.of(),
                Map.of("invoiceJson", invoiceJson, "paperSize", "Letter")));

        try (PDDocument a4Doc = PDDocument.load(a4.outputFile().toFile());
             PDDocument letterDoc = PDDocument.load(letter.outputFile().toFile())) {
            PDRectangle a4Box = a4Doc.getPage(0).getMediaBox();
            assertThat(a4Box.getWidth()).isCloseTo(PDRectangle.A4.getWidth(), within(2f));   // ≈595pt
            assertThat(a4Box.getHeight()).isCloseTo(PDRectangle.A4.getHeight(), within(2f)); // ≈842pt

            PDRectangle letterBox = letterDoc.getPage(0).getMediaBox();
            assertThat(letterBox.getWidth()).isCloseTo(PDRectangle.LETTER.getWidth(), within(2f));   // ≈612pt
            assertThat(letterBox.getHeight()).isCloseTo(PDRectangle.LETTER.getHeight(), within(2f)); // ≈792pt
        }
    }

    @Test
    void 지원하지_않는_용지_크기는_공용_렌더러의_검증_메시지를_그대로_사용한다() {
        // HtmlToPdfRenderer.pageRule/resolvePaperSize 재사용 여부를 회귀 방지로 검증한다.
        String invoiceJson = """
                {"issuer": "A", "recipient": "B", "items": [{"description": "X", "quantity": 1, "unitPrice": 10}]}
                """;

        assertThatThrownBy(() -> module.process(new ToolInput(List.of(),
                Map.of("invoiceJson", invoiceJson, "paperSize", "B4"))))
                .isInstanceOf(ToolProcessingException.class)
                .hasMessageContaining("용지 크기는 A4, Letter, A5");
    }

    @Test
    void moduleMetadata() {
        assertThat(module.getId()).isEqualTo("invoice-generator");
        assertThat(module.isHeavy()).isTrue();
        assertThat(module.getCategory()).isEqualTo("pdf");
    }
}
