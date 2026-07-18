package com.back.global.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class DotenvEnvironmentPostProcessorTest {

    private final DotenvEnvironmentPostProcessor processor = new DotenvEnvironmentPostProcessor();

    @Test
    void env_파일이_없으면_아무것도_하지_않는다(@TempDir Path dir) {
        MockEnvironment environment = new MockEnvironment();

        processor.load(dir.resolve(".env"), environment);

        assertThat(environment.getProperty("GOOGLE_CLIENT_ID")).isNull();
    }

    @Test
    void env_파일의_키값을_프로퍼티로_등록한다(@TempDir Path dir) throws IOException {
        Path envFile = dir.resolve(".env");
        Files.writeString(envFile, "GOOGLE_CLIENT_ID=real-client-id\nKAKAO_CLIENT_ID=real-kakao-id\n");
        MockEnvironment environment = new MockEnvironment();

        processor.load(envFile, environment);

        assertThat(environment.getProperty("GOOGLE_CLIENT_ID")).isEqualTo("real-client-id");
        assertThat(environment.getProperty("KAKAO_CLIENT_ID")).isEqualTo("real-kakao-id");
    }

    @Test
    void 빈줄과_주석은_무시한다(@TempDir Path dir) throws IOException {
        Path envFile = dir.resolve(".env");
        Files.writeString(envFile, "# comment line\n\nGOOGLE_CLIENT_ID=real-client-id\n   \n");
        MockEnvironment environment = new MockEnvironment();

        processor.load(envFile, environment);

        assertThat(environment.getProperty("GOOGLE_CLIENT_ID")).isEqualTo("real-client-id");
    }

    @Test
    void 이미_설정된_실제_환경변수가_env_파일_값보다_우선한다(@TempDir Path dir) throws IOException {
        Path envFile = dir.resolve(".env");
        Files.writeString(envFile, "GOOGLE_CLIENT_ID=dotenv-value\n");
        MockEnvironment environment = new MockEnvironment();
        environment.setProperty("GOOGLE_CLIENT_ID", "real-system-env-value");

        processor.load(envFile, environment);

        assertThat(environment.getProperty("GOOGLE_CLIENT_ID")).isEqualTo("real-system-env-value");
    }

    @Test
    void 첫번째_후보_경로에_파일이_있으면_그걸_쓴다(@TempDir Path dir) throws IOException {
        Path first = dir.resolve("first.env");
        Path second = dir.resolve("second.env");
        Files.writeString(first, "GOOGLE_CLIENT_ID=from-first\n");
        Files.writeString(second, "GOOGLE_CLIENT_ID=from-second\n");

        assertThat(DotenvEnvironmentPostProcessor.firstExisting(first, second)).contains(first);
    }

    @Test
    void 첫번째_후보가_없으면_다음_후보를_쓴다(@TempDir Path dir) throws IOException {
        Path first = dir.resolve("missing.env");
        Path second = dir.resolve("second.env");
        Files.writeString(second, "GOOGLE_CLIENT_ID=from-second\n");

        assertThat(DotenvEnvironmentPostProcessor.firstExisting(first, second)).contains(second);
    }

    @Test
    void 후보가_전부_없으면_빈값이다(@TempDir Path dir) {
        assertThat(DotenvEnvironmentPostProcessor.firstExisting(dir.resolve("a"), dir.resolve("b"))).isEmpty();
    }
}
