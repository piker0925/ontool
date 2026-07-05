package com.back.domain.job;

import com.back.domain.tool.ToolInput;
import com.back.domain.tool.ToolModule;
import com.back.domain.tool.ToolProcessingException;
import com.back.domain.tool.ToolResult;
import com.back.global.storage.FileStorage;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class JobWorker {

    private final JobRepository jobRepository;
    private final List<ToolModule> moduleList;
    private final FileStorage fileStorage;
    private final ThreadPoolTaskExecutor taskExecutor;

    private Map<String, ToolModule> modules;

    @PostConstruct
    void init() {
        modules = moduleList.stream()
                .collect(Collectors.toMap(ToolModule::getId, m -> m));
    }

    @Scheduled(fixedDelayString = "${scheduling.worker.delay:3000}")
    @Transactional
    public void poll() {
        jobRepository.findFirstPendingWithLock().ifPresent(job -> {
            job.setStatus(JobStatus.RUNNING);
            jobRepository.save(job);
            String jobId = job.getId();
            taskExecutor.execute(() -> processJob(jobId));
        });
    }

    void processJob(String jobId) {
        Job job = jobRepository.findById(jobId).orElseThrow();
        try {
            ToolModule module = Optional.ofNullable(modules.get(job.getModuleId()))
                    .orElseThrow(() -> new ToolProcessingException("Module not found: " + job.getModuleId()));

            List<Path> paths = Optional.ofNullable(job.getInputPaths()).orElse(List.of())
                    .stream().map(Path::of).toList();
            Map<String, String> params = Optional.ofNullable(job.getParams()).orElse(Map.of());

            ToolResult result = module.process(new ToolInput(paths, params));

            if (result.isFile()) {
                String key = jobId + "/result." + ext(result.outputFile());
                fileStorage.save(key, result.outputFile());
                job.setResultKey(key);
            } else {
                job.setResultText(result.textResult());
            }
            job.setStatus(JobStatus.DONE);
        } catch (Exception e) {
            log.error("Job {} 처리 실패: {}", jobId, e.getMessage(), e);
            job.setStatus(JobStatus.FAILED);
        } finally {
            jobRepository.save(job);
        }
    }

    private String ext(Path file) {
        String name = file.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot + 1) : "bin";
    }
}
