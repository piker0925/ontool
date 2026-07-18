package com.back.tool.pdf;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolParams;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * PDFBox {@link StandardProtectionPolicy}로 PDF 비밀번호를 설정하거나 제거한다.
 * 소유자 비밀번호는 별도로 관리하지 않고 사용자 비밀번호와 동일하게 설정한다 — 이 도구는 열람 암호만
 * 다루고 인쇄/편집 등 세분화된 권한 정책은 범위 밖이라, 입력한 비밀번호로 곧바로 전체 권한(소유자 권한)을
 * 얻어야 제거(REMOVE)도 같은 비밀번호로 온전히 동작한다.
 */
@Component
public class PdfPasswordModule implements ToolModule {

    enum Mode { SET, REMOVE }

    @Override
    public String getId() { return "pdf-password"; }

    @Override
    public String getName() { return "PDF 비밀번호 설정/해제"; }

    @Override
    public String getCategory() { return "pdf"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        ToolParams params = ToolParams.of(input);
        Mode mode = params.getEnum("mode", Mode.class, Mode.SET);
        String password = params.requireString("password");
        Path pdf = input.files().get(0);
        requirePdfExtension(pdf);

        return switch (mode) {
            case SET -> setPassword(pdf, password);
            case REMOVE -> removePassword(pdf, password);
        };
    }

    private ToolResult setPassword(Path pdf, String password) {
        try (PDDocument doc = PDDocument.load(pdf.toFile())) {
            AccessPermission permission = new AccessPermission();
            StandardProtectionPolicy policy = new StandardProtectionPolicy(password, password, permission);
            policy.setEncryptionKeyLength(128);
            doc.protect(policy);
            Path output = Files.createTempFile("pwset-", ".pdf");
            doc.save(output.toFile());
            return ToolResult.ofFile(output);
        } catch (InvalidPasswordException e) {
            throw new ToolProcessingException("이미 비밀번호가 설정된 PDF입니다. 먼저 비밀번호를 제거한 뒤 다시 설정하세요.", e);
        } catch (IOException e) {
            throw new ToolProcessingException("PDF 비밀번호 설정 실패: " + e.getMessage(), e);
        }
    }

    private ToolResult removePassword(Path pdf, String password) {
        try (PDDocument doc = PDDocument.load(pdf.toFile(), password)) {
            doc.setAllSecurityToBeRemoved(true);
            Path output = Files.createTempFile("pwremove-", ".pdf");
            doc.save(output.toFile());
            return ToolResult.ofFile(output);
        } catch (InvalidPasswordException e) {
            throw new ToolProcessingException("비밀번호가 올바르지 않아 PDF를 열 수 없습니다.", e);
        } catch (IOException e) {
            throw new ToolProcessingException("PDF 비밀번호 제거 실패: " + e.getMessage(), e);
        }
    }

    private void requirePdfExtension(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        if (!name.endsWith(".pdf")) {
            throw new ToolProcessingException("PDF 파일만 지원합니다. (입력 파일: " + file.getFileName() + ")");
        }
    }
}
