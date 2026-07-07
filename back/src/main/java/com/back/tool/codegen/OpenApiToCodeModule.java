package com.back.tool.codegen;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.openapitools.codegen.ClientOptInput;
import org.openapitools.codegen.DefaultGenerator;
import org.openapitools.codegen.config.CodegenConfigurator;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class OpenApiToCodeModule implements ToolModule {

    @Override
    public String getId() { return "openapi-to-code"; }

    @Override
    public String getName() { return "OpenAPI → 코드 생성"; }

    @Override
    public String getCategory() { return "codegen"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        try {
            Path specFile = input.files().get(0);
            String language = input.params().getOrDefault("language", "java");
            Path outputDir = Files.createTempDirectory("openapi-");

            CodegenConfigurator configurator = new CodegenConfigurator()
                    .setGeneratorName(language)
                    .setInputSpec(specFile.toAbsolutePath().toString())
                    .setOutputDir(outputDir.toAbsolutePath().toString());

            ClientOptInput clientOptInput = configurator.toClientOptInput();
            new DefaultGenerator().opts(clientOptInput).generate();

            Path zipPath = Files.createTempFile("openapi-", ".zip");
            zipDirectory(outputDir, zipPath);
            deleteDir(outputDir.toFile());
            return ToolResult.ofFile(zipPath);
        } catch (Exception e) {
            throw new ToolProcessingException("OpenAPI 코드 생성 실패: " + e.getMessage(), e);
        }
    }

    private void zipDirectory(Path dir, Path zipPath) throws IOException {
        try (OutputStream fos = Files.newOutputStream(zipPath);
             ZipOutputStream zip = new ZipOutputStream(fos)) {
            Files.walk(dir)
                    .filter(p -> !Files.isDirectory(p))
                    .forEach(p -> {
                        try {
                            zip.putNextEntry(new ZipEntry(dir.relativize(p).toString()));
                            Files.copy(p, zip);
                            zip.closeEntry();
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });
        }
    }

    private void deleteDir(File dir) {
        File[] files = dir.listFiles();
        if (files != null) for (File f : files) {
            if (f.isDirectory()) deleteDir(f);
            else f.delete();
        }
        dir.delete();
    }
}
