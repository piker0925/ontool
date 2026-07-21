package com.back.tool.controller;

import com.back.global.exception.AppException;
import com.back.global.exception.ErrorCode;
import com.back.global.ratelimit.ClientIpResolver;
import com.back.global.ratelimit.RateLimiter;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final RateLimiter rateLimiter;
    private final Path uploadDir;
    private final long heavyMaxFileSizeBytes;
    private final long heavyMaxRequestSizeBytes;
    private final long videoMaxFileSizeBytes;
    private final long videoMaxRequestSizeBytes;

    public ToolController(ToolService toolService, JobService jobService,
                          ToolStatsService toolStatsService,
                          AdmissionControl admissionControl,
                          RateLimiter rateLimiter,
                          @Value("${storage.upload-dir:uploads}") String uploadDir,
                          @Value("${upload.max-file-size-bytes.heavy}") long heavyMaxFileSizeBytes,
                          @Value("${upload.max-request-size-bytes.heavy}") long heavyMaxRequestSizeBytes,
                          @Value("${upload.max-file-size-bytes.video}") long videoMaxFileSizeBytes,
                          @Value("${upload.max-request-size-bytes.video}") long videoMaxRequestSizeBytes) {
        this.toolService = toolService;
        this.jobService = jobService;
        this.toolStatsService = toolStatsService;
        this.admissionControl = admissionControl;
        this.rateLimiter = rateLimiter;
        this.uploadDir = Path.of(uploadDir);
        this.heavyMaxFileSizeBytes = heavyMaxFileSizeBytes;
        this.heavyMaxRequestSizeBytes = heavyMaxRequestSizeBytes;
        this.videoMaxFileSizeBytes = videoMaxFileSizeBytes;
        this.videoMaxRequestSizeBytes = videoMaxRequestSizeBytes;
    }

    @GetMapping("/modules")
    public List<ModuleResponse> listModules() {
        return toolService.listModules().stream()
                .map(m -> new ModuleResponse(m.getId(), m.getName(), m.getCategory(), m.isHeavy(),
                        // Light 모듈은 업로드 경로가 없어 한도가 의미 없으므로 0 — 프론트는 heavy 모듈에서만 이 값을 쓴다.
                        // 크기 판정은 getLane()이 아니라 getUploadSizeLane()(106) — 동시성 레인과 다를 수 있다.
                        m.isHeavy() && m.getUploadSizeLane() == Lane.VIDEO ? videoMaxFileSizeBytes
                                : m.isHeavy() ? heavyMaxFileSizeBytes : 0,
                        m.isHeavy() && m.getUploadSizeLane() == Lane.VIDEO ? videoMaxRequestSizeBytes
                                : m.isHeavy() ? heavyMaxRequestSizeBytes : 0))
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
                                    @RequestPart(value = "files", required = false) List<MultipartFile> files,
                                    @RequestParam Map<String, String> params,
                                    @AuthenticationPrincipal Long userId,
                                    HttpServletRequest request) {
        if (files == null) {
            files = List.of();
        }
        ToolModule module = toolService.getModule(moduleId);
        if (!module.isHeavy()) {
            throw new AppException(ErrorCode.INVALID_MODULE_TYPE);
        }

        // 익명 식별자: 프론트가 localStorage에서 관리해 헤더로 보낸다 (ADR-0019). 없으면 null → 쿼터 생략.
        String ownerToken = request.getHeader("X-Client-Id");
        Lane lane = module.getLane();

        // 레인별 업로드 한도 재검증(106): 컨테이너(서블릿) 레벨 한도는 모든 레인 중 가장 큰 값(VIDEO)
        // 기준이라, 이미지·PDF 같은 HEAVY 레인은 여기서 좁은 한도로 다시 거른다. 디스크 I/O 전이라 가장 싸다.
        // getLane()(동시성)이 아니라 getUploadSizeLane()(힙 위험 기준)으로 판정한다 — video-metadata처럼
        // 처리는 HEAVY 레인이어도 크기 한도는 VIDEO를 따르는 모듈이 있다.
        assertWithinLaneSizeLimit(module.getUploadSizeLane(), files);

        // IP당 요청 빈도 앞단 거부(040): 배치든 단건이든 루프 전에 한 번만 검사한다.
        rateLimiter.assertNotLimited(ClientIpResolver.resolve(request));

        // 용량 기반 앞단 거부(036): 배치든 단건이든 루프 전에 한 번만 검사해 부분 생성을 막는다.
        admissionControl.assertCapacityAvailable(lane);

        // 파일이 없거나(파일 불필요 모듈, 086) 단일 파일이거나 모든 파일을 하나의 job으로 처리하는 모듈(pdf-merge, gif-create)
        if (files.isEmpty() || files.size() == 1 || module.acceptsMultipleFiles()) {
            jobService.assertWithinQuota(ownerToken, 1);
            String tempId = UUID.randomUUID().toString();
            List<String> paths = saveFiles(tempId, files);
            Job job = jobService.create(moduleId, lane, ownerToken, userId, paths, params);
            return ResponseEntity.accepted().body(new JobCreateResponse(job.getId(), job.getExpiresAt()));
        }

        // 파일 1개당 job 1개 — 배치 전체 개수를 미리 쿼터에 반영해 부분 생성이 남지 않게 한다.
        jobService.assertWithinQuota(ownerToken, files.size());
        String batchId = UUID.randomUUID().toString();
        List<Job> jobs = files.stream().map(file -> {
            String tempId = UUID.randomUUID().toString();
            List<String> paths = saveFiles(tempId, List.of(file));
            return jobService.create(moduleId, lane, ownerToken, userId, batchId, paths, params);
        }).toList();
        List<String> jobIds = jobs.stream().map(Job::getId).toList();
        return ResponseEntity.accepted().body(new BatchCreateResponse(batchId, jobIds));
    }

    private void assertWithinLaneSizeLimit(Lane lane, List<MultipartFile> files) {
        long maxFileSize = lane == Lane.VIDEO ? videoMaxFileSizeBytes : heavyMaxFileSizeBytes;
        long maxRequestSize = lane == Lane.VIDEO ? videoMaxRequestSizeBytes : heavyMaxRequestSizeBytes;

        long total = 0;
        for (MultipartFile file : files) {
            if (file.getSize() > maxFileSize) {
                throw new AppException(ErrorCode.FILE_TOO_LARGE);
            }
            total += file.getSize();
        }
        if (total > maxRequestSize) {
            throw new AppException(ErrorCode.FILE_TOO_LARGE);
        }
    }

    private List<String> saveFiles(String tempId, List<MultipartFile> files) {
        return files.stream().map(file -> {
            String name = sanitizeFileName(file.getOriginalFilename());
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

    // 업로드 파일명은 공격자가 제어할 수 있는 입력이다(../../ 등으로 uploadDir 밖에 쓰기 시도 가능,
    // CodeQL java/path-injection). getFileName()으로 경로 구분자를 걷어내 파일명만 남긴다.
    private String sanitizeFileName(String originalFilename) {
        String raw = originalFilename != null ? originalFilename : "upload";
        String name = Path.of(StringUtils.cleanPath(raw)).getFileName().toString();
        if (name.isBlank() || name.equals(".") || name.equals("..")) {
            return "upload";
        }
        return name;
    }
}
