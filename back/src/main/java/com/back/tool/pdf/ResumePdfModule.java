package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.vladsch.flexmark.util.ast.Node;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * 마크다운 이력서 원고 → PDF. 마크다운 파싱(flexmark)은 {@link MarkdownToPdfModule}의
 * PARSER/RENDERER를 그대로 재사용하고, 이력서 전용 CSS 템플릿만 다르게 적용한다.
 */
@Component
public class ResumePdfModule implements ToolModule {

    @Override
    public String getId() { return "resume-pdf"; }

    @Override
    public String getName() { return "이력서 PDF 생성"; }

    @Override
    public String getCategory() { return "pdf"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        if (input.files().isEmpty()) {
            throw new ToolProcessingException("이력서 마크다운 파일이 필요합니다.");
        }

        ToolParams params = ToolParams.of(input);
        String paperSize = HtmlToPdfRenderer.resolvePaperSize(params.getString("paperSize", "A4"));
        int marginMm = params.getInt("margin", 15, 0, 50);

        try {
            String markdown = Files.readString(input.files().get(0));
            Node document = MarkdownToPdfModule.PARSER.parse(markdown);
            // MarkdownToPdfModule과 동일한 이유로 &nbsp;를 실제 공백으로 미리 치환한다.
            String body = MarkdownToPdfModule.RENDERER.render(document).replace("&nbsp;", " ");

            String html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/>"
                    + "<style>" + HtmlToPdfRenderer.pageRule(paperSize, marginMm)
                    + "body{font-family:'" + HtmlToPdfRenderer.FONT_FAMILY
                    + "',sans-serif;margin:0;line-height:1.5;color:#1f2937}"
                    + "h1{font-size:22pt;border-bottom:2px solid #111827;padding-bottom:6px;margin:0 0 4px 0}"
                    + "h2{font-size:14pt;color:#111827;border-bottom:1px solid #9ca3af;"
                    + "margin-top:18px;padding-bottom:2px}"
                    + "h3{font-size:12pt;margin-bottom:2px}"
                    + "p{margin:4px 0}"
                    + "ul{margin:4px 0;padding-left:20px}"
                    + "table{border-collapse:collapse;width:100%}"
                    + "th,td{border:1px solid #d0d0d0;padding:6px 10px;text-align:left}"
                    + "code{font-family:'" + HtmlToPdfRenderer.FONT_FAMILY + "',monospace}"
                    + "</style></head><body>" + body + "</body></html>";

            Path output = HtmlToPdfRenderer.renderToTempFile(html, "resume-");
            return ToolResult.ofFile(output);
        } catch (Exception e) {
            throw new ToolProcessingException("이력서 PDF 생성 실패: " + e.getMessage(), e);
        }
    }
}
