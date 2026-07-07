package com.back.tool.codegen;

import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolProcessingException;
import com.back.tool.model.ToolResult;
import com.sun.codemodel.JCodeModel;
import org.jsonschema2pojo.DefaultGenerationConfig;
import org.jsonschema2pojo.GenerationConfig;
import org.jsonschema2pojo.Jackson2Annotator;
import org.jsonschema2pojo.SchemaGenerator;
import org.jsonschema2pojo.SchemaMapper;
import org.jsonschema2pojo.SchemaStore;
import org.jsonschema2pojo.rules.RuleFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class JsonSchemaToDtoModule implements ToolModule {

    @Override
    public String getId() { return "json-schema-to-dto"; }

    @Override
    public String getName() { return "JSON Schema → DTO"; }

    @Override
    public String getCategory() { return "codegen"; }

    @Override
    public boolean isHeavy() { return true; }

    @Override
    public ToolResult process(ToolInput input) {
        try {
            Path schemaFile = input.files().get(0);
            String packageName = input.params().getOrDefault("packageName", "com.generated");
            String className = schemaFile.getFileName().toString()
                    .replaceAll("\\.json$", "").replaceAll("[^a-zA-Z0-9]", "_");

            Path outputDir = Files.createTempDirectory("j2p-");
            generateDto(schemaFile, outputDir, packageName, className);

            Path zipPath = Files.createTempFile("j2p-", ".zip");
            zipDirectory(outputDir, zipPath);
            deleteDir(outputDir.toFile());
            return ToolResult.ofFile(zipPath);
        } catch (Exception e) {
            throw new ToolProcessingException("DTO 생성 실패: " + e.getMessage(), e);
        }
    }

    private void generateDto(Path schema, Path outputDir, String pkg, String className) throws Exception {
        GenerationConfig config = new DefaultGenerationConfig();
        SchemaMapper mapper = new SchemaMapper(
                new RuleFactory(config, new Jackson2Annotator(config), new SchemaStore()),
                new SchemaGenerator());
        JCodeModel codeModel = new JCodeModel();
        mapper.generate(codeModel, className, pkg, schema.toUri().toURL());
        codeModel.build(outputDir.toFile());
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
