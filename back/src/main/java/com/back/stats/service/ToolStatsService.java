package com.back.stats.service;

import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.stats.entity.ToolStats;
import com.back.stats.repository.ToolStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ToolStatsService {

    private final ToolStatsRepository toolStatsRepository;
    private final JobRepository jobRepository;

    @Transactional(readOnly = true)
    public List<ToolStats> findAll() {
        return toolStatsRepository.findAll();
    }

    // 관리자 통계 목록에서 모듈별 실패 건수를 한 번의 쿼리로 배치 조회한다(N+1 방지, 109).
    // 결과 맵에는 실패 건수가 있는 모듈만 담긴다 — 호출부는 getOrDefault(moduleId, 0L)로 읽는다.
    @Transactional(readOnly = true)
    public Map<String, Long> getFailCounts(Collection<String> moduleIds) {
        if (moduleIds.isEmpty()) {
            return Map.of();
        }
        Map<String, Long> counts = new HashMap<>();
        jobRepository.countGroupedByModuleIdInAndStatus(moduleIds, JobStatus.FAILED)
                .forEach(row -> counts.put(row.getModuleId(), row.getCount()));
        return counts;
    }

    @Transactional
    public ToolStats getOrCreate(String moduleId) {
        return toolStatsRepository.findById(moduleId)
                .orElseGet(() -> {
                    toolStatsRepository.insertIfAbsent(moduleId);
                    return toolStatsRepository.findById(moduleId).orElseThrow();
                });
    }

    @Transactional
    public void incrementUseCount(String moduleId) {
        toolStatsRepository.upsertIncrementUseCount(moduleId);
    }

    @Transactional
    public void incrementLikeCount(String moduleId) {
        toolStatsRepository.upsertIncrementLikeCount(moduleId);
    }

    @Transactional
    public void decrementLikeCount(String moduleId) {
        toolStatsRepository.decrementLikeCount(moduleId);
    }
}
