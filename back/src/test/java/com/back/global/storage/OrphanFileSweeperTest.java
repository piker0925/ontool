package com.back.global.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class OrphanFileSweeperTest {

    @TempDir
    Path root;

    final OrphanFileSweeper sweeper = new OrphanFileSweeper();

    private Path fileWithAge(String relative, Duration age) throws IOException {
        Path p = root.resolve(relative);
        Files.createDirectories(p.getParent());
        Files.writeString(p, "data");
        Files.setLastModifiedTime(p, FileTime.from(Instant.now().minus(age)));
        return p;
    }

    @Test
    void sweep_deletesOldFile_keepsFreshFile() throws IOException {
        // 두 행위자: 오래된 고아 파일(2시간 전) vs 방금 만든 파일.
        Path old = fileWithAge("temp/old-job/a.png", Duration.ofHours(2));
        Path fresh = fileWithAge("temp/new-job/b.png", Duration.ofSeconds(1));

        sweeper.sweep(root, Duration.ofHours(1));

        assertThat(old).doesNotExist();
        assertThat(fresh).exists(); // 조건에 안 맞는 최신 파일은 살아남아야 한다
    }

    @Test
    void sweep_removesEmptiedDirectory_keepsDirectoryWithSurvivor() throws IOException {
        fileWithAge("temp/old-job/a.png", Duration.ofHours(2));
        fileWithAge("temp/new-job/b.png", Duration.ofSeconds(1));

        sweeper.sweep(root, Duration.ofHours(1));

        assertThat(root.resolve("temp/old-job")).doesNotExist(); // 비워진 디렉토리도 정리
        assertThat(root.resolve("temp/new-job")).exists();       // 생존 파일이 있는 디렉토리는 유지
    }

    @Test
    void sweep_missingRoot_isNoOp_doesNotTouchOtherFiles() throws IOException {
        // 존재하는 오래된 파일 하나 — 스윕 대상 경로가 아니므로 건드리면 안 된다.
        Path bystander = fileWithAge("elsewhere/old.png", Duration.ofHours(5));

        sweeper.sweep(root.resolve("does-not-exist"), Duration.ofHours(1));

        assertThat(bystander).exists(); // 없는 경로 스윕은 예외 없이 아무것도 삭제하지 않는다
    }

    @Test
    void deleteRecursively_removesTree() throws IOException {
        Path dir = root.resolve("temp/some-id");
        Files.createDirectories(dir);
        Files.writeString(dir.resolve("in1.png"), "x");
        Files.writeString(dir.resolve("in2.png"), "y");

        sweeper.deleteRecursively(dir);

        assertThat(dir).doesNotExist();
    }
}
