package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class PdfMergeModule implements ToolModule {

    @Override
    public String getId() { return "pdf-merge"; }

    @Override
    public String getName() { return "PDF 병합"; }

    @Override
    public String getCategory() { return "pdf"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public boolean acceptsMultipleFiles() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        requireFiles(input);
        try {
            Path output = Files.createTempFile("pdfmerge-", ".pdf");
            PDFMergerUtility merger = new PDFMergerUtility();
            merger.setDestinationFileName(output.toString());
            for (Path pdf : input.files()) {
                merger.addSource(pdf.toFile());
            }
            merger.mergeDocuments(null);
            return ToolResult.ofFile(output);
        } catch (IOException e) {
            throw new ToolProcessingException("PDF 병합 실패: " + e.getMessage(), e);
        }
    }
}
