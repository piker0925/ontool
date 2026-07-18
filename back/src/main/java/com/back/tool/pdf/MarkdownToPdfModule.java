package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.vladsch.flexmark.ext.autolink.AutolinkExtension;
import com.vladsch.flexmark.ext.gfm.strikethrough.StrikethroughExtension;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.ast.Node;
import com.vladsch.flexmark.util.data.MutableDataSet;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class MarkdownToPdfModule implements ToolModule {

    // package-private: ResumePdfModule도 같은 flexmark 파싱 설정을 재사용한다.
    static final Parser PARSER;
    static final HtmlRenderer RENDERER;
    private static final Pattern HEADING = Pattern.compile("<h([1-6])>(.*?)</h\\1>", Pattern.DOTALL);
    private static final Pattern TAG = Pattern.compile("<[^>]+>");

    static {
        MutableDataSet options = new MutableDataSet();
        options.set(Parser.EXTENSIONS, List.of(
                TablesExtension.create(), StrikethroughExtension.create(), AutolinkExtension.create()));
        PARSER = Parser.builder(options).build();
        RENDERER = HtmlRenderer.builder(options).build();
    }

    @Override
    public String getId() { return "markdown-to-pdf"; }

    @Override
    public String getName() { return "마크다운 → PDF"; }

    @Override
    public String getCategory() { return "pdf"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        String paperSize = HtmlToPdfRenderer.resolvePaperSize(params.getString("paperSize", "A4"));
        int marginMm = params.getInt("margin", 20, 0, 50);
        boolean toc = params.getBool("toc", false);

        try {
            String markdown = Files.readString(input.files().get(0));
            Node document = PARSER.parse(markdown);
            // 사용자가 붙여넣은 raw HTML에 &nbsp; 같은 미선언 엔티티가 섞여 있으면 openhtmltopdf의
            // 엄격한 XML 파서가 변환 자체를 실패시키므로 실제 공백 문자로 미리 치환해 둔다.
            String body = RENDERER.render(document).replace("&nbsp;", " ");
            if (toc) {
                body = injectToc(body);
            }
            String html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/>"
                    + "<style>" + HtmlToPdfRenderer.pageRule(paperSize, marginMm)
                    + "body{font-family:'" + HtmlToPdfRenderer.FONT_FAMILY + "',sans-serif;margin:0;line-height:1.6}"
                    + "pre{background:#f4f4f4;padding:12px;border-radius:4px;white-space:pre-wrap;word-break:break-all}"
                    + "code{font-family:'" + HtmlToPdfRenderer.FONT_FAMILY + "',monospace}"
                    + "table{border-collapse:collapse;width:100%}"
                    + "th,td{border:1px solid #d0d0d0;padding:6px 10px;text-align:left}"
                    + "th{background:#f4f4f4}"
                    + "blockquote{margin:0 0 1em 0;padding:8px 14px;border-left:4px solid #6b7280;"
                    + "background:#f4f4f5;color:#3f3f46;font-style:italic}"
                    + "ul.toc{list-style:none;padding:0;page-break-after:always}"
                    + "ul.toc a{color:#1a56db;text-decoration:none}</style></head><body>"
                    + body + "</body></html>";

            Path output = HtmlToPdfRenderer.renderToTempFile(html, "md2pdf-");
            return ToolResult.ofFile(output);
        } catch (Exception e) {
            throw new ToolProcessingException("마크다운 → PDF 변환 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 본문의 h1~h6에 id를 부여하고, 문서 맨 앞에 내부 링크 목차를 삽입한다.
     * 헤딩이 없으면 원본 그대로 반환한다.
     */
    static String injectToc(String body) {
        Matcher m = HEADING.matcher(body);
        StringBuilder rewritten = new StringBuilder();
        StringBuilder tocItems = new StringBuilder();
        int count = 0;
        while (m.find()) {
            count++;
            int level = Integer.parseInt(m.group(1));
            String inner = m.group(2);
            String id = "toc-" + count;
            m.appendReplacement(rewritten, Matcher.quoteReplacement(
                    "<h" + level + " id=\"" + id + "\">" + inner + "</h" + level + ">"));
            String plainText = TAG.matcher(inner).replaceAll("").trim();
            tocItems.append("<li style=\"margin-left:").append((level - 1) * 14).append("px\">")
                    .append("<a href=\"#").append(id).append("\">").append(plainText).append("</a></li>");
        }
        if (count == 0) {
            return body;
        }
        m.appendTail(rewritten);
        return "<ul class=\"toc\">" + tocItems + "</ul>" + rewritten;
    }
}
