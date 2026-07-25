package com.back.job.service;

import com.back.job.dto.DailyJobCount;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.stats.service.ToolStatsService;
import com.back.tool.model.Lane;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

    @Test
    void displayFilenameFor_jobId를_찾으면_원본파일명_기반_이름을_돌려준다() {
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30), 20);
        Job job = new Job();
        job.setInputPaths(List.of("/uploads/temp/x/invoice.pdf"));
        when(jobRepository.findById("job-1")).thenReturn(Optional.of(job));

        String filename = service.displayFilenameFor("job-1/result.txt", "result.txt");

        assertThat(filename).isEqualTo("invoice.txt");
    }

    @Test
    void displayFilenameFor_job을_못찾으면_fallback을_돌려준다() {
        // "찾으면 원본명"과 "못 찾으면 fallback"을 같은 키 모양으로 구분 — 하나만 검증하면
        // findById 결과와 무관하게 항상 같은 값이 나오는 구현도 통과해버린다.
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30), 20);
        when(jobRepository.findById("missing")).thenReturn(Optional.empty());

        String filename = service.displayFilenameFor("missing/result.txt", "result.txt");

        assertThat(filename).isEqualTo("result.txt");
    }

    @Test
    void displayFilenameFor_키에_구분자가_없으면_조회없이_fallback을_돌려준다() {
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30), 20);

        String filename = service.displayFilenameFor("no-slash-key", "fallback.txt");

        assertThat(filename).isEqualTo("fallback.txt");
    }

    @Test
    void getDailyJobCounts_같은날짜의_성공_실패를_합치고_데이터없는_날은_0으로_채운다() {
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30), 20);
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        // 그저께는 리포지토리가 아무 행도 안 돌려준다 — 0으로 채워져야 한다(그래프에 구멍 방지).
        when(jobRepository.countGroupedByDateAndStatusSince(any())).thenReturn(List.of(
                dailyStatusCount(yesterday, JobStatus.DONE, 5),
                dailyStatusCount(yesterday, JobStatus.FAILED, 2),
                dailyStatusCount(today, JobStatus.DONE, 1)
        ));

        List<DailyJobCount> result = service.getDailyJobCounts(3);

        assertThat(result).hasSize(3); // 그저께, 어제, 오늘
        DailyJobCount twoDaysAgo = result.get(0);
        assertThat(twoDaysAgo.date()).isEqualTo(today.minusDays(2));
        assertThat(twoDaysAgo.doneCount()).isZero();
        assertThat(twoDaysAgo.failCount()).isZero();

        DailyJobCount y = result.stream().filter(r -> r.date().equals(yesterday)).findFirst().orElseThrow();
        assertThat(y.doneCount()).isEqualTo(5);
        assertThat(y.failCount()).isEqualTo(2);

        DailyJobCount t = result.stream().filter(r -> r.date().equals(today)).findFirst().orElseThrow();
        assertThat(t.doneCount()).isEqualTo(1);
        assertThat(t.failCount()).isZero();
    }

    @Test
    void getDailyJobCounts_days가_상한을_넘으면_90일로_잘린다() {
        JobService service = new JobService(jobRepository, toolStatsService, Duration.ofMinutes(30), 20);
        when(jobRepository.countGroupedByDateAndStatusSince(any())).thenReturn(List.of());

        List<DailyJobCount> result = service.getDailyJobCounts(10_000);

        assertThat(result).hasSize(90);
    }

    // Spring Data 프로젝션 인터페이스는 getX() 접근자 이름 규약에 의존하므로, 레코드 컴포넌트 이름을
    // 그대로 getDate/getStatus/getCount로 지어 컴파일러가 생성하는 접근자가 인터페이스를 그대로 만족하게 한다.
    private static JobRepository.DailyStatusCount dailyStatusCount(LocalDate date, JobStatus status, long count) {
        record Row(LocalDate getDate, JobStatus getStatus, Long getCount) implements JobRepository.DailyStatusCount {
        }
        return new Row(date, status, count);
    }
}
