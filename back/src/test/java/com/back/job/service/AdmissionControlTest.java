package com.back.job.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.tool.model.Lane;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 용량 기반 앞단 거부 게이트의 순수 정책 (036).
 * 실제 디스크/큐 측정은 어댑터가 맡고, 여기서는 "숫자 대 임계"의 판정만 검증한다.
 */
class AdmissionControlTest {

    @Test
    void 디스크_사용량이_예산_이내면_통과한다() {
        assertThatCode(() -> AdmissionControl.checkDiskBudget(5_000L, 10_000L))
                .doesNotThrowAnyException();
    }

    @Test
    void 디스크_사용량이_예산과_같으면_통과한다() {
        // 경계: 같음은 "초과"가 아니다.
        assertThatCode(() -> AdmissionControl.checkDiskBudget(10_000L, 10_000L))
                .doesNotThrowAnyException();
    }

    @Test
    void 디스크_사용량이_예산을_초과하면_STORAGE_FULL을_던진다() {
        assertThatThrownBy(() -> AdmissionControl.checkDiskBudget(10_001L, 10_000L))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.STORAGE_FULL);
    }

    @Test
    void 대기_작업수가_임계와_같으면_통과한다() {
        // 경계: 같음은 "초과"가 아니다.
        assertThatCode(() -> AdmissionControl.checkQueueDepth(200, 200))
                .doesNotThrowAnyException();
    }

    @Test
    void 대기_작업수가_임계를_초과하면_QUEUE_FULL을_던진다() {
        assertThatThrownBy(() -> AdmissionControl.checkQueueDepth(201, 200))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.QUEUE_FULL);
    }

    @Test
    void currentUsageBytes_업로드_디렉토리의_중첩_파일까지_크기_합을_반환한다(@TempDir Path dir) throws IOException {
        Files.write(dir.resolve("a.bin"), new byte[100]);
        Files.createDirectories(dir.resolve("temp/x"));
        Files.write(dir.resolve("temp/x/b.bin"), new byte[250]); // 중첩(temp 입력)도 포함해야 함

        AdmissionControl ac = new AdmissionControl(null, dir.toString(), 999_999L, 200, 10);

        assertThat(ac.currentUsageBytes()).isEqualTo(350L);
    }

    @Test
    void currentUsageBytes_디렉토리가_없으면_0을_반환한다() {
        AdmissionControl ac = new AdmissionControl(null, "/nonexistent-xyz-uploads-036", 1L, 1, 1);

        assertThat(ac.currentUsageBytes()).isEqualTo(0L);
    }

    @Test
    void assertCapacityAvailable_디스크_사용량이_예산을_넘으면_STORAGE_FULL(@TempDir Path dir) throws IOException {
        Files.write(dir.resolve("big.bin"), new byte[500]);
        JobRepository repo = mock(JobRepository.class);
        when(repo.countByLaneAndStatus(any(), any())).thenReturn(0); // 큐는 여유

        AdmissionControl ac = new AdmissionControl(repo, dir.toString(), 100L, 200, 10); // 예산 100 < 500

        assertThatThrownBy(() -> ac.assertCapacityAvailable(Lane.HEAVY))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.STORAGE_FULL);
    }

    @Test
    void assertCapacityAvailable_레인별_임계로_큐를_판정한다_VIDEO는_좁게(@TempDir Path dir) {
        JobRepository repo = mock(JobRepository.class);
        when(repo.countByLaneAndStatus(Lane.VIDEO, JobStatus.PENDING)).thenReturn(11); // VIDEO 임계 10 초과

        AdmissionControl ac = new AdmissionControl(repo, dir.toString(), 999_999L, 200, 10); // 디스크는 여유

        // VIDEO 임계(10)로 판정해야 QUEUE_FULL. HEAVY 임계(200)를 잘못 쓰면 11은 통과 → 판별력 확보.
        assertThatThrownBy(() -> ac.assertCapacityAvailable(Lane.VIDEO))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.QUEUE_FULL);
    }

    @Test
    void assertCapacityAvailable_HEAVY는_넓은_임계로_판정한다(@TempDir Path dir) {
        JobRepository repo = mock(JobRepository.class);
        when(repo.countByLaneAndStatus(Lane.HEAVY, JobStatus.PENDING)).thenReturn(11); // HEAVY 임계 200 이내

        AdmissionControl ac = new AdmissionControl(repo, dir.toString(), 999_999L, 200, 10); // 디스크는 여유

        // HEAVY는 200으로 판정 → 11은 통과. VIDEO 임계(10)를 잘못 쓰면 11이 거절돼 실패 → VIDEO 케이스와 짝을 이뤄
        // 레인→임계 매핑을 양방향으로 잠근다.
        assertThatCode(() -> ac.assertCapacityAvailable(Lane.HEAVY)).doesNotThrowAnyException();
    }

    @Test
    void assertCapacityAvailable_디스크와_큐_모두_여유면_통과한다(@TempDir Path dir) {
        JobRepository repo = mock(JobRepository.class);
        when(repo.countByLaneAndStatus(any(), any())).thenReturn(5); // < 200

        AdmissionControl ac = new AdmissionControl(repo, dir.toString(), 999_999L, 200, 10);

        assertThatCode(() -> ac.assertCapacityAvailable(Lane.HEAVY)).doesNotThrowAnyException();
    }
}
