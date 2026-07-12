package com.back.job.service;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.BatchStats;
import com.back.job.repository.JobRepository;
import com.back.stats.service.ToolStatsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final ToolStatsService toolStatsService;
    private final Duration resultTtl;

    public JobService(JobRepository jobRepository,
                      ToolStatsService toolStatsService,
                      @Value("${storage.result-ttl}") Duration resultTtl) {
        this.jobRepository = jobRepository;
        this.toolStatsService = toolStatsService;
        this.resultTtl = resultTtl;
    }

    public Job create(String moduleId, List<String> inputPaths, Map<String, String> params) {
        return create(moduleId, null, inputPaths, params);
    }

    public Job create(String moduleId, String batchId, List<String> inputPaths, Map<String, String> params) {
        toolStatsService.incrementUseCount(moduleId);
        Job job = new Job();
        job.setModuleId(moduleId);
        job.setBatchId(batchId);
        job.setStatus(JobStatus.PENDING);
        job.setInputPaths(inputPaths);
        job.setParams(params);
        job.setExpiresAt(LocalDateTime.now().plus(resultTtl));
        return jobRepository.save(job);
    }

    public Job get(String id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
    }

    public List<Job> getBatchJobs(String batchId) {
        return jobRepository.findAllByBatchId(batchId);
    }

    public BatchStats getBatchStats(String batchId) {
        return jobRepository.getBatchStats(batchId);
    }
}
