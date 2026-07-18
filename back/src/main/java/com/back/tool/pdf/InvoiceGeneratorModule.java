package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.util.List;

/**
 * 인보이스(청구서) 데이터(JSON 문자열, 단일 파라미터) → PDF.
 * 품목 합계는 항상 서버가 품목(수량×단가)을 다시 계산해서 채운다 — 클라이언트가 보낸 합계값은 신뢰하지 않는다.
 */
@Component
public class InvoiceGeneratorModule implements ToolModule {

    private static final String PARAM_KEY = "invoiceJson";
    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Override
    public String getId() { return "invoice-generator"; }

    @Override
    public String getName() { return "인보이스 생성기"; }

    @Override
    public String getCategory() { return "pdf"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        InvoiceData invoice = parseInvoice(params.requireString(PARAM_KEY));
        String paperSize = HtmlToPdfRenderer.resolvePaperSize(params.getString("paperSize", "A4"));
        int marginMm = params.getInt("margin", 20, 0, 50);

        try {
            String html = renderHtml(invoice, paperSize, marginMm);
            Path output = HtmlToPdfRenderer.renderToTempFile(html, "invoice-");
            return ToolResult.ofFile(output);
        } catch (Exception e) {
            throw new ToolProcessingException("인보이스 PDF 생성 실패: " + e.getMessage(), e);
        }
    }

    private InvoiceData parseInvoice(String json) {
        InvoiceData invoice;
        try {
            invoice = JSON.readValue(json, InvoiceData.class);
        } catch (Exception e) {
            throw new ToolProcessingException("인보이스 데이터 형식이 올바르지 않습니다: " + e.getMessage(), e);
        }
        if (invoice == null) {
            throw new ToolProcessingException("인보이스 데이터가 비어 있습니다.");
        }
        if (isBlank(invoice.issuer())) {
            throw new ToolProcessingException("발행자(issuer)는 필수입니다.");
        }
        if (isBlank(invoice.recipient())) {
            throw new ToolProcessingException("수신자(recipient)는 필수입니다.");
        }
        if (invoice.items() == null || invoice.items().isEmpty()) {
            throw new ToolProcessingException("품목(items)이 최소 1개 이상 필요합니다.");
        }
        for (InvoiceItem item : invoice.items()) {
            if (isBlank(item.description())) {
                throw new ToolProcessingException("품목명(description)은 필수입니다.");
            }
            if (item.quantity() == null || item.unitPrice() == null) {
                throw new ToolProcessingException("품목의 수량(quantity)과 단가(unitPrice)는 필수입니다.");
            }
            if (item.quantity().signum() < 0 || item.unitPrice().signum() < 0) {
                throw new ToolProcessingException("수량과 단가는 0 이상이어야 합니다.");
            }
        }
        return invoice;
    }

    private String renderHtml(InvoiceData invoice, String paperSize, int marginMm) {
        BigDecimal total = invoice.items().stream()
                .map(InvoiceItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        StringBuilder rows = new StringBuilder();
        for (InvoiceItem item : invoice.items()) {
            rows.append("<tr><td>").append(escape(item.description())).append("</td>")
                    .append("<td class=\"num\">").append(item.quantity().stripTrailingZeros().toPlainString())
                    .append("</td>")
                    .append("<td class=\"num\">").append(money(item.unitPrice())).append("</td>")
                    .append("<td class=\"num\">").append(money(item.lineTotal())).append("</td></tr>");
        }

        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/>"
                + "<style>" + HtmlToPdfRenderer.pageRule(paperSize, marginMm)
                + "body{font-family:'" + HtmlToPdfRenderer.FONT_FAMILY + "',sans-serif;margin:0;color:#111827}"
                + "h1{font-size:20pt;margin:0 0 4px 0}"
                + ".meta{color:#4b5563;margin-bottom:4px}"
                + "table{border-collapse:collapse;width:100%;margin-top:16px}"
                + "th,td{border:1px solid #d0d0d0;padding:6px 10px;text-align:left}"
                + "th{background:#f4f4f4}"
                + ".num{text-align:right}"
                + ".total-row td{font-weight:bold}"
                + "</style></head><body>"
                + "<h1>INVOICE" + (isBlank(invoice.invoiceNumber()) ? "" : " " + escape(invoice.invoiceNumber())) + "</h1>"
                + (isBlank(invoice.issueDate()) ? "" : "<div class=\"meta\">발행일: " + escape(invoice.issueDate()) + "</div>")
                + "<div class=\"meta\"><strong>발행자</strong>: " + escape(invoice.issuer())
                + (isBlank(invoice.issuerAddress()) ? "" : " (" + escape(invoice.issuerAddress()) + ")") + "</div>"
                + "<div class=\"meta\"><strong>수신자</strong>: " + escape(invoice.recipient())
                + (isBlank(invoice.recipientAddress()) ? "" : " (" + escape(invoice.recipientAddress()) + ")") + "</div>"
                + "<table><thead><tr><th>품목</th><th>수량</th><th>단가</th><th>금액</th></tr></thead><tbody>"
                + rows
                + "<tr class=\"total-row\"><td colspan=\"3\">합계</td><td class=\"num\">" + money(total) + "</td></tr>"
                + "</tbody></table>"
                + "</body></html>";
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    record InvoiceItem(String description, BigDecimal quantity, BigDecimal unitPrice) {
        BigDecimal lineTotal() {
            return quantity.multiply(unitPrice);
        }
    }

    record InvoiceData(
            String issuer,
            String issuerAddress,
            String recipient,
            String recipientAddress,
            String invoiceNumber,
            String issueDate,
            List<InvoiceItem> items) {
    }
}
