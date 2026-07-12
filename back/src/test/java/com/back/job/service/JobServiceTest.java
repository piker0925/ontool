package com.back.job.service;

import com.back.job.entity.Job;
import com.back.job.repository.JobRepository;
import com.back.stats.service.ToolStatsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock
    JobRepository jobRepository;
    @Mock
    ToolStatsService toolStatsService;

    @Test
    void create_setsExpiresAtFromConfiguredTtl() {
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30));
        when(jobRepository.save(any(Job.class))).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime before = LocalDateTime.now();
        Job job = service.create("image-resize", List.of("uploads/temp/x/a.png"), Map.of());
        LocalDateTime after = LocalDateTime.now();

        // expiresAt은 "지금 + 설정된 TTL(30분)" 범위 안에 있어야 한다.
        assertThat(job.getExpiresAt())
                .isAfterOrEqualTo(before.plusMinutes(30))
                .isBeforeOrEqualTo(after.plusMinutes(30));
    }

    @Test
    void create_shortTtl_producesEarlierExpiryThanLongTtl() {
        // 서로 다른 TTL이 실제로 서로 다른 만료 시각을 만든다 (설정이 반영됨을 두 행위자로 확인).
        JobService shortTtl = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(2));
        JobService longTtl = new JobService(jobRepository, toolStatsService, Duration.ofHours(24));
        when(jobRepository.save(any(Job.class))).thenAnswer(inv -> inv.getArgument(0));

        Job shortJob = shortTtl.create("m", List.of(), Map.of());
        Job longJob = longTtl.create("m", List.of(), Map.of());

        assertThat(shortJob.getExpiresAt()).isBefore(longJob.getExpiresAt());
    }
}
