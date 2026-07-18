package com.back.tool.pdf;

import com.back.global.util.FilenameSanitizer;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class PdfSplitModule implements ToolModule {

    /** 1부터 시작하는 양 끝 포함 페이지 범위 */
    record PageRange(int start, int end) {}

    @Override
    public String getId() { return "pdf-split"; }

    @Override
    public String getName() { return "PDF 분할"; }

    @Override
    public String getCategory() { return "pdf"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        ToolParams params = ToolParams.of(input);
        String pageRangeSpec = params.getString("pageRange", "");
        String groupMode = params.getString("groupMode", "낱장");
        if (!groupMode.equals("낱장") && !groupMode.equals("구간")) {
            throw new ToolProcessingException(
                    "분할 방식은 낱장(페이지별 1파일) 또는 구간(범위별 1파일)이어야 합니다. (입력값: " + groupMode + ")");
        }

        try {
            Path inputPdf = input.files().get(0);
            String baseName = baseNameOf(inputPdf);
            Path output = Files.createTempFile("pdfsplit-", ".zip");

            try (PDDocument doc = PDDocument.load(inputPdf.toFile())) {
                int totalPages = doc.getNumberOfPages();
                List<PageRange> ranges = pageRangeSpec.isBlank()
                        ? List.of(new PageRange(1, totalPages))
                        : parsePageRanges(pageRangeSpec, totalPages);

                try (OutputStream fos = Files.newOutputStream(output);
                     ZipOutputStream zip = new ZipOutputStream(fos)) {
                    if (groupMode.equals("낱장")) {
                        writePerPage(doc, ranges, zip, baseName);
                    } else {
                        writePerRange(doc, ranges, zip, baseName);
                    }
                }
            }
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("PDF 분할 실패: " + e.getMessage(), e);
        }
    }

    /**
     * 원본 업로드 파일명을 zip 엔트리 이름의 접두어로 쓴다. {@link FilenameSanitizer}로 Zip Slip 등
     * 위험 문자를 제거하는 것은 {@link com.back.job.service.ZipEntryNamer}와 동일한 기존 관례를 따른다.
     */
    static String baseNameOf(Path inputPdf) {
        String sanitized = FilenameSanitizer.sanitize(inputPdf.getFileName().toString());
        int dot = sanitized.lastIndexOf('.');
        String base = dot > 0 ? sanitized.substring(0, dot) : sanitized;
        return base.isEmpty() ? "split" : base;
    }

    /** 페이지별 1파일: {원본이름}-004.pdf 처럼 원본 페이지 번호를 이어붙인다 (중복 페이지는 1회만) */
    private void writePerPage(PDDocument doc, List<PageRange> ranges, ZipOutputStream zip, String baseName)
            throws IOException {
        Set<Integer> pages = new LinkedHashSet<>();
        for (PageRange range : ranges) {
            for (int p = range.start(); p <= range.end(); p++) pages.add(p);
        }
        for (int p : pages) {
            writePages(doc, p, p, zip, String.format("%s-%03d.pdf", baseName, p));
        }
    }

    /** 범위별 1파일: {원본이름}-001-003.pdf (단일 페이지 범위는 {원본이름}-005.pdf) */
    private void writePerRange(PDDocument doc, List<PageRange> ranges, ZipOutputStream zip, String baseName)
            throws IOException {
        Set<String> usedNames = new LinkedHashSet<>();
        for (PageRange range : ranges) {
            String name = range.start() == range.end()
                    ? String.format("%s-%03d.pdf", baseName, range.start())
                    : String.format("%s-%03d-%03d.pdf", baseName, range.start(), range.end());
            if (!usedNames.add(name)) continue; // 동일 범위 중복 입력은 1회만
            writePages(doc, range.start(), range.end(), zip, name);
        }
    }

    private void writePages(PDDocument src, int start, int end, ZipOutputStream zip, String entryName)
            throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try (PDDocument out = new PDDocument()) {
            for (int p = start; p <= end; p++) {
                out.importPage(src.getPage(p - 1));
            }
            out.save(buffer);
        }
        zip.putNextEntry(new ZipEntry(entryName));
        zip.write(buffer.toByteArray());
        zip.closeEntry();
    }

    /**
     * '1-3,5,7-' 형식의 페이지 범위 문법을 파싱한다.
     * 열린 범위('7-')의 끝과 총 페이지를 초과하는 끝 페이지는 총 페이지로 조정한다.
     */
    static List<PageRange> parsePageRanges(String spec, int totalPages) {
        List<PageRange> ranges = new ArrayList<>();
        for (String token : spec.split(",", -1)) {
            String t = token.trim();
            if (t.isEmpty()) {
                throw new ToolProcessingException(
                        "페이지 범위에 빈 항목이 있습니다: '" + spec + "' (예: 1-3,5)");
            }
            int start;
            int end;
            int dash = t.indexOf('-');
            if (dash >= 0) {
                if (t.indexOf('-', dash + 1) >= 0) {
                    throw new ToolProcessingException(
                            "페이지 범위 형식이 잘못되었습니다: '" + t + "' (예: 1-3,5)");
                }
                start = parsePageNumber(t.substring(0, dash), t);
                String endPart = t.substring(dash + 1).trim();
                end = endPart.isEmpty() ? totalPages : parsePageNumber(endPart, t);
            } else {
                start = parsePageNumber(t, t);
                end = start;
            }
            if (start < 1) {
                throw new ToolProcessingException("페이지 번호는 1 이상이어야 합니다: '" + t + "'");
            }
            if (start > totalPages) {
                throw new ToolProcessingException(
                        "시작 페이지(" + start + ")가 문서의 총 페이지 수(" + totalPages + ")를 초과합니다.");
            }
            if (end < start) {
                throw new ToolProcessingException(
                        "시작 페이지가 끝 페이지보다 큽니다: '" + t + "'");
            }
            if (end > totalPages) {
                end = totalPages; // 초과분은 유효 범위로 조정
            }
            ranges.add(new PageRange(start, end));
        }
        return ranges;
    }

    private static int parsePageNumber(String value, String token) {
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            throw new ToolProcessingException(
                    "페이지 범위 형식이 잘못되었습니다: '" + token + "' (예: 1-3,5)");
        }
    }
}
