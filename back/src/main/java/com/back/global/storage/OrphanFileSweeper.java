package com.back.global.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;

/**
 * 업로드 디렉토리의 파일을 정리하는 단일 진입점.
 * <p>
 * Job row에 의존하지 않고 파일 최종수정시각(mtime) 기준으로 청소하므로,
 * Job 생성 실패나 로컬 create-drop 등으로 참조를 잃은 고아 파일도 안전망으로 회수한다.
 */
@Slf4j
@Component
public class OrphanFileSweeper {

    /**
     * {@code root} 하위에서 최종수정시각이 {@code maxAge}보다 오래된 파일을 삭제하고,
     * 그 결과 비게 된 디렉토리를 정리한다.
     */
    public void sweep(Path root, Duration maxAge) {
        if (root == null || !Files.exists(root)) {
            return;
        }
        Instant cutoff = Instant.now().minus(maxAge);
        try {
            // 1) 오래된 파일 삭제
            try (var paths = Files.walk(root)) {
                paths.filter(Files::isRegularFile)
                        .filter(p -> isOlderThan(p, cutoff))
                        .forEach(this::deleteQuietly);
            }
            // 2) 비워진 디렉토리 정리 (root 자신은 남긴다)
            try (var paths = Files.walk(root)) {
                paths.filter(Files::isDirectory)
                        .filter(p -> !p.equals(root))
                        .sorted(Comparator.reverseOrder())
                        .forEach(this::deleteIfEmpty);
            }
        } catch (IOException e) {
            log.warn("업로드 디렉토리 스윕 실패: {}", root, e);
        }
    }

    /**
     * 디렉토리 트리를 통째로 삭제한다. 처리 완료 후 입력 임시 디렉토리 즉시 삭제 등에 사용.
     */
    public void deleteRecursively(Path dir) {
        if (dir == null || !Files.exists(dir)) {
            return;
        }
        try (var paths = Files.walk(dir)) {
            paths.sorted(Comparator.reverseOrder()).forEach(this::deleteQuietly);
        } catch (IOException e) {
            log.warn("디렉토리 삭제 실패: {}", dir, e);
        }
    }

    private boolean isOlderThan(Path file, Instant cutoff) {
        try {
            return Files.getLastModifiedTime(file).toInstant().isBefore(cutoff);
        } catch (IOException e) {
            log.warn("파일 수정시각 조회 실패: {}", file, e);
            return false;
        }
    }

    private void deleteIfEmpty(Path dir) {
        try (var entries = Files.list(dir)) {
            if (entries.findAny().isEmpty()) {
                Files.delete(dir);
            }
        } catch (IOException e) {
            log.warn("빈 디렉토리 삭제 실패: {}", dir, e);
        }
    }

    private void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("파일 삭제 실패: {}", path, e);
        }
    }
}
