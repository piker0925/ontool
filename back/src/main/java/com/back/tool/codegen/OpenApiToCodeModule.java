package com.back.tool.codegen;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import org.openapitools.codegen.ClientOptInput;
import org.openapitools.codegen.DefaultGenerator;
import org.openapitools.codegen.config.CodegenConfigurator;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;

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
        requireFiles(input);
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
            CodegenZipSupport.zipDirectory(outputDir, zipPath);
            CodegenZipSupport.deleteDir(outputDir.toFile());
            return ToolResult.ofFile(zipPath);
        } catch (Exception e) {
            throw new ToolProcessingException("OpenAPI 코드 생성 실패: " + e.getMessage(), e);
        }
    }
}
