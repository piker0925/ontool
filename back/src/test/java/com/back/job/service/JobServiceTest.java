package com.back.job.service;

import com.back.job.entity.Job;
import com.back.job.repository.JobRepository;
import com.back.stats.service.ToolStatsService;
import com.back.tool.model.Lane;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock
    JobRepository jobRepository;
    @Mock
    ToolStatsService toolStatsService;

    @Test
    void create_setsExpiresAtFromConfiguredTtl() {
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30), 20);
        when(jobRepository.save(any(Job.class))).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime before = LocalDateTime.now();
        Job job = service.create("image-resize", Lane.HEAVY, "owner-1", null, List.of("uploads/temp/x/a.png"), Map.of());
        LocalDateTime after = LocalDateTime.now();

        // expiresAt은 "지금 + 설정된 TTL(30분)" 범위 안에 있어야 한다.
        assertThat(job.getExpiresAt())
                .isAfterOrEqualTo(before.plusMinutes(30))
                .isBeforeOrEqualTo(after.plusMinutes(30));
    }

    @Test
    void create_shortTtl_producesEarlierExpiryThanLongTtl() {
        // 서로 다른 TTL이 실제로 서로 다른 만료 시각을 만든다 (설정이 반영됨을 두 행위자로 확인).
        JobService shortTtl = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(2), 20);
        JobService longTtl = new JobService(jobRepository, toolStatsService, Duration.ofHours(24), 20);
        when(jobRepository.save(any(Job.class))).thenAnswer(inv -> inv.getArgument(0));

        Job shortJob = shortTtl.create("m", Lane.HEAVY, "owner-1", null, List.of(), Map.of());
        Job longJob = longTtl.create("m", Lane.HEAVY, "owner-1", null, List.of(), Map.of());

        assertThat(shortJob.getExpiresAt()).isBefore(longJob.getExpiresAt());
    }

    @Test
    void assertWithinQuota_atOrUnderLimit_passes_butOver_throws() {
        // 상한 20. 두 행위자로 "딱 맞는 것"과 "넘는 것"을 구분한다.
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30), 20);

        // 현재 19개 in-flight → +1 = 20 (경계, 허용)
        when(jobRepository.countByOwnerTokenAndStatusIn(eq("owner-ok"), anyCollection())).thenReturn(19);
        assertThatCode(() -> service.assertWithinQuota("owner-ok", 1)).doesNotThrowAnyException();

        // 현재 20개 in-flight → +1 = 21 (초과, 거부)
        when(jobRepository.countByOwnerTokenAndStatusIn(eq("owner-over"), anyCollection())).thenReturn(20);
        assertThatThrownBy(() -> service.assertWithinQuota("owner-over", 1))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.QUOTA_EXCEEDED);
    }

    @Test
    void assertWithinQuota_batchThatWouldExceed_throwsBeforeAnyCreated() {
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30), 20);
        // 현재 5개 + 배치 16개 = 21 > 20 → 배치 전체 거부(부분 생성 방지)
        when(jobRepository.countByOwnerTokenAndStatusIn(eq("owner-batch"), anyCollection())).thenReturn(5);
        assertThatThrownBy(() -> service.assertWithinQuota("owner-batch", 16))
                .isInstanceOf(AppException.class);
    }

    @Test
    void assertWithinQuota_nullOwner_isSkipped() {
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30), 20);
        assertThatCode(() -> service.assertWithinQuota(null, 999)).doesNotThrowAnyException();
    }
}
