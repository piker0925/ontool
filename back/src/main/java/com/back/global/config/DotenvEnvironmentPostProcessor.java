package com.back.global.config;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

// 로컬 .env(gitignore 대상, 구글·카카오 client-id/secret)를 실행 방식과 무관하게 채운다.
// Gradle bootRun 전용 주입과 달리 Spring Boot 부트스트랩 단계에서 동작해 IntelliJ 내장
// 러너·java -jar 어떤 방식으로 띄워도 적용된다. 파일이 없으면(prod, 다른 개발자 PC 등) 조용히 무시한다.
// 후보 경로 두 곳을 본다 — IntelliJ 실행 설정이 작업 디렉토리를 저장소 루트로 잡는 경우와
// back/ 자체를 작업 디렉토리로 잡는 경우(Gradle bootRun, java -jar) 둘 다 커버하기 위함.
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        firstExisting(Path.of("back", ".env"), Path.of(".env"))
                .ifPresent(envFile -> load(envFile, environment));
    }

    static Optional<Path> firstExisting(Path... candidates) {
        for (Path candidate : candidates) {
            if (Files.exists(candidate)) {
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }

    void load(Path envFile, ConfigurableEnvironment environment) {
        if (!Files.exists(envFile)) {
            return;
        }

        Map<String, Object> values = new LinkedHashMap<>();
        try {
            for (String line : Files.readAllLines(envFile)) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
                    continue;
                }
                String[] parts = trimmed.split("=", 2);
                values.put(parts[0].trim(), parts[1].trim());
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read " + envFile, e);
        }

        if (!values.isEmpty()) {
            // addLast: 이미 설정된 실제 시스템 환경변수(우선순위 더 높은 프로퍼티소스)가 항상 이긴다.
            environment.getPropertySources().addLast(new MapPropertySource("dotenv", values));
        }
    }
}
