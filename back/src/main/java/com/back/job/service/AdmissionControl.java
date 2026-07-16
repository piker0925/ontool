package com.back.job.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.tool.model.Lane;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

/**
 * 용량 기반 앞단 거부(admission control, 036).
 * 감당 불가 부하는 큐에 쌓기 전에 문 앞에서 거절한다 — 스케줄러(ADR-0019)는 이미 들어온 작업의
 * 공정 처리를 맡고, 이 컴포넌트는 그 앞단(수용/거부)을 맡는다.
 * 정책(숫자 대 임계 판정)은 정적 메서드로 순수하게 두고, 측정(디스크 walk·큐 count)은 인스턴스가 붙인다.
 */
@Component
public class AdmissionControl {

    private final JobRepository jobRepository;
    private final Path uploadDir;
    private final long diskBudgetBytes;
    private final int heavyQueueThreshold;
    private final int videoQueueThreshold;

    public AdmissionControl(
            JobRepository jobRepository,
            @Value("${storage.upload-dir}") String uploadDir,
            // 기본 10GB. uploads+results 누적 상한. prod 실제 디스크(df -h) 확인 후 값 확정.
            @Value("${storage.disk-budget-bytes:10737418240}") long diskBudgetBytes,
            @Value("${queue.max-pending.heavy:200}") int heavyQueueThreshold,
            @Value("${queue.max-pending.video:10}") int videoQueueThreshold) {
        this.jobRepository = jobRepository;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath();
        this.diskBudgetBytes = diskBudgetBytes;
        this.heavyQueueThreshold = heavyQueueThreshold;
        this.videoQueueThreshold = videoQueueThreshold;
    }

    /**
     * 이 레인의 새 작업을 지금 수용할 수 있는지 검사한다. 못 받으면 문 앞에서 거절(예외).
     * 배치는 개별 파일마다가 아니라 루프 전에 한 번만 호출해 부분 거절을 피한다.
     */
    public void assertCapacityAvailable(Lane lane) {
        checkDiskBudget(currentUsageBytes(), diskBudgetBytes);
        checkQueueDepth(jobRepository.countByLaneAndStatus(lane, JobStatus.PENDING), thresholdFor(lane));
    }

    private int thresholdFor(Lane lane) {
        return lane == Lane.VIDEO ? videoQueueThreshold : heavyQueueThreshold;
    }

    /**
     * uploads 디렉토리 하위(입력 temp + 결과) 모든 regular 파일 크기의 합. 없으면 0.
     * 일시적 IO 오류는 0으로 fail-open 한다 — 측정 실패로 모든 업로드를 막기보다, 이 게이트를
     * 잠깐 통과시키고 다음 요청에서 다시 측정하는 편이 낫다(디스크가 진짜 차면 OS 쓰기가 먼저 실패한다).
     */
    long currentUsageBytes() {
        if (!Files.exists(uploadDir)) {
            return 0L;
        }
        try (Stream<Path> walk = Files.walk(uploadDir)) {
            return walk.filter(Files::isRegularFile).mapToLong(AdmissionControl::sizeOrZero).sum();
        } catch (IOException _) {
            return 0L;
        }
    }

    private static long sizeOrZero(Path p) {
        try {
            return Files.size(p);
        } catch (IOException _) {
            return 0L;
        }
    }

    /** uploads+results 누적 사용량이 예산을 넘으면 STORAGE_FULL(507). 같음은 초과 아님. */
    static void checkDiskBudget(long usageBytes, long budgetBytes) {
        if (usageBytes > budgetBytes) {
            throw new AppException(ErrorCode.STORAGE_FULL);
        }
    }

    /** 해당 레인의 PENDING 대기 수가 임계를 넘으면 QUEUE_FULL(503). 같음은 초과 아님. */
    static void checkQueueDepth(int pendingCount, int threshold) {
        if (pendingCount > threshold) {
            throw new AppException(ErrorCode.QUEUE_FULL);
        }
    }
}
