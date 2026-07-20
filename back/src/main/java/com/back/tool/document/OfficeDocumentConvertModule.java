package com.back.tool.document;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

/**
 * 기존 클라이언트 문서 뷰어(073)가 못 읽는 오피스 문서(HWP/HWPX/PPTX/레거시 DOC·XLS·PPT)를
 * LibreOffice headless로 PDF로 변환하는 Heavy 모듈(094, ADR-0029).
 */
@Component
@RequiredArgsConstructor
public class OfficeDocumentConvertModule implements ToolModule {

    private final LibreOfficeConvertSupport libreOffice;

    @Override
    public String getId() { return "office-document-convert"; }

    @Override
    public String getName() { return "오피스 문서 변환기"; }

    @Override
    public String getCategory() { return "document"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        Path source = input.files().get(0);
        return ToolResult.ofFile(libreOffice.convertToPdf(source));
    }
}
