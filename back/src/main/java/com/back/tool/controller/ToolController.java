package com.back.tool.controller;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.job.dto.BatchCreateResponse;
import com.back.job.dto.JobCreateResponse;
import com.back.job.entity.Job;
import com.back.job.service.AdmissionControl;
import com.back.job.service.JobService;
import com.back.tool.dto.ModuleResponse;
import com.back.tool.dto.RunResponse;
import com.back.tool.model.Lane;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolResult;
import com.back.stats.service.ToolStatsService;
import com.back.tool.service.ToolService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ToolController {

    private final ToolService toolService;
    private final JobService jobService;
    private final ToolStatsService toolStatsService;
    private final AdmissionControl admissionControl;
    private final Path uploadDir;

    public ToolController(ToolService toolService, JobService jobService,
                          ToolStatsService toolStatsService,
                          AdmissionControl admissionControl,
                          @Value("${storage.upload-dir:uploads}") String uploadDir) {
        this.toolService = toolService;
        this.jobService = jobService;
        this.toolStatsService = toolStatsService;
        this.admissionControl = admissionControl;
        this.uploadDir = Path.of(uploadDir);
    }

    @GetMapping("/modules")
    public List<ModuleResponse> listModules() {
        return toolService.listModules().stream()
                .map(m -> new ModuleResponse(m.getId(), m.getName(), m.getCategory(), m.isHeavy()))
                .toList();
    }

    @PostMapping("/tools/{moduleId}/run")
    public RunResponse run(@PathVariable String moduleId,
                           @RequestBody Map<String, String> params) {
        ToolModule module = toolService.getModule(moduleId);
        if (module.isHeavy()) {
            throw new AppException(ErrorCode.INVALID_MODULE_TYPE);
        }
        ToolResult result = module.process(new ToolInput(List.of(), params));
        toolStatsService.incrementUseCount(moduleId);
        return new RunResponse(result.textResult());
    }

    @PostMapping("/tools/{moduleId}/upload")
    public ResponseEntity<?> upload(@PathVariable String moduleId,
                                    @RequestPart("files") List<MultipartFile> files,
                                    @RequestParam Map<String, String> params,
                                    HttpServletRequest request) {
        ToolModule module = toolService.getModule(moduleId);
        if (!module.isHeavy()) {
            throw new AppException(ErrorCode.INVALID_MODULE_TYPE);
        }

        // 익명 식별자: 프론트가 localStorage에서 관리해 헤더로 보낸다 (ADR-0019). 없으면 null → 쿼터 생략.
        String ownerToken = request.getHeader("X-Client-Id");
        Lane lane = module.getLane();

        // 용량 기반 앞단 거부(036): 배치든 단건이든 루프 전에 한 번만 검사해 부분 생성을 막는다.
        admissionControl.assertCapacityAvailable(lane);

        // 단일 파일이거나 모든 파일을 하나의 job으로 처리하는 모듈 (pdf-merge, gif-create)
        if (files.size() == 1 || module.acceptsMultipleFiles()) {
            jobService.assertWithinQuota(ownerToken, 1);
            String tempId = UUID.randomUUID().toString();
            List<String> paths = saveFiles(tempId, files);
            Job job = jobService.create(moduleId, lane, ownerToken, paths, params);
            return ResponseEntity.accepted().body(new JobCreateResponse(job.getId(), job.getExpiresAt()));
        }

        // 파일 1개당 job 1개 — 배치 전체 개수를 미리 쿼터에 반영해 부분 생성이 남지 않게 한다.
        jobService.assertWithinQuota(ownerToken, files.size());
        String batchId = UUID.randomUUID().toString();
        List<Job> jobs = files.stream().map(file -> {
            String tempId = UUID.randomUUID().toString();
            List<String> paths = saveFiles(tempId, List.of(file));
            return jobService.create(moduleId, lane, ownerToken, batchId, paths, params);
        }).toList();
        List<String> jobIds = jobs.stream().map(Job::getId).toList();
        return ResponseEntity.accepted().body(new BatchCreateResponse(batchId, jobIds));
    }

    private List<String> saveFiles(String tempId, List<MultipartFile> files) {
        return files.stream().map(file -> {
            String name = StringUtils.cleanPath(
                    file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload");
            Path dest = uploadDir.toAbsolutePath().resolve("temp").resolve(tempId).resolve(name);
            try {
                Files.createDirectories(dest.getParent());
                file.transferTo(dest.toFile());
                return dest.toAbsolutePath().toString();
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }).toList();
    }
}
