package com.back.global.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Component
@Profile({"local", "prod"})
public class LocalFileStorage implements FileStorage {

    private final Path uploadDir;
    private final String baseUrl;

    public LocalFileStorage(
            @Value("${storage.upload-dir:uploads}") String uploadDir,
            @Value("${storage.base-url:http://localhost:8080}") String baseUrl) {
        this.uploadDir = Path.of(uploadDir);
        this.baseUrl = baseUrl;
    }

    @Override
    public void save(String key, Path localFile) {
        Path target = uploadDir.resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(localFile, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public String getUrl(String key) {
        return baseUrl + "/api/v1/files/" + key;
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(uploadDir.resolve(key));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public InputStream openStream(String key) throws IOException {
        return Files.newInputStream(uploadDir.resolve(key));
    }
}
