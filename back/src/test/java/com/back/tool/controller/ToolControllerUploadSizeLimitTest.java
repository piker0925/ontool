package com.back.tool.controller;

import com.back.global.exception.GlobalExceptionHandler;
import com.back.global.ratelimit.RateLimiter;
import com.back.job.entity.Job;
import com.back.job.repository.JobRepository;
import com.back.job.service.AdmissionControl;
import com.back.job.service.JobService;
import com.back.tool.model.Lane;
import com.back.tool.model.ToolModule;
import com.back.stats.service.ToolStatsService;
import com.back.tool.service.ToolService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 업로드 엔드포인트가 레인별 파일 크기 한도(106)를 실제로 재검증하는지 — 컨테이너 레벨 한도(VIDEO 기준
 * 1GB)를 통과했어도, HEAVY 레인은 그보다 좁은 한도로 컨트롤러에서 다시 거부해야 한다.
 */
class ToolControllerUploadSizeLimitTest {

    private static final long HEAVY_MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024;
    private static final long HEAVY_MAX_REQUEST_SIZE_BYTES = 100L * 1024 * 1024;
    private static final long VIDEO_MAX_FILE_SIZE_BYTES = 1024L * 1024 * 1024;
    private static final long VIDEO_MAX_REQUEST_SIZE_BYTES = 2048L * 1024 * 1024;

    private MockMvc buildMockMvc(Lane lane, JobService jobService) {
        return buildMockMvc(lane, lane, jobService);
    }

    // processingLane: 동시성 판정(getLane, ADR-0019). sizeLane: 업로드 크기 판정(getUploadSizeLane, 106).
    // video-metadata처럼 둘이 다른 모듈(HEAVY 처리 + VIDEO 크기)을 재현하기 위해 분리해서 받는다.
    private MockMvc buildMockMvc(Lane processingLane, Lane sizeLane, JobService jobService) {
        ToolService toolService = mock(ToolService.class);
        JobRepository jobRepository = mock(JobRepository.class);
        ToolModule module = mock(ToolModule.class);
        when(module.isHeavy()).thenReturn(true);
        when(module.getLane()).thenReturn(processingLane);
        when(module.getUploadSizeLane()).thenReturn(sizeLane);
        when(toolService.getModule("test-module")).thenReturn(module);

        AdmissionControl admissionControl =
                new AdmissionControl(jobRepository, "build/test-uploads-sizelimit", 999_999_999L, 200, 10);
        RateLimiter rateLimiter = new RateLimiter(999_999, 60);

        ToolController controller = new ToolController(
                toolService, jobService, mock(ToolStatsService.class), admissionControl, rateLimiter,
                "build/test-uploads-sizelimit",
                HEAVY_MAX_FILE_SIZE_BYTES, HEAVY_MAX_REQUEST_SIZE_BYTES,
                VIDEO_MAX_FILE_SIZE_BYTES, VIDEO_MAX_REQUEST_SIZE_BYTES);

        return MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void HEAVY_레인은_파일당_한도를_넘으면_413으로_거부하고_Job을_만들지_않는다() throws Exception {
        JobService jobService = mock(JobService.class);
        MockMvc mockMvc = buildMockMvc(Lane.HEAVY, jobService);

        MockMultipartFile big = new MockMultipartFile(
                "files", "big.jpg", "image/jpeg", new byte[(int) (HEAVY_MAX_FILE_SIZE_BYTES + 1)]);

        mockMvc.perform(multipart("/api/v1/tools/test-module/upload").file(big))
                .andExpect(status().is(413));

        verify(jobService, never()).create(any(), any(), any(), any(), any(), any());
    }

    @Test
    void VIDEO_레인은_HEAVY_한도를_넘는_파일도_VIDEO_한도_이내면_받아들인다() throws Exception {
        JobService jobService = mock(JobService.class);
        when(jobService.create(any(), any(), any(), any(), any(), any())).thenReturn(mock(Job.class));
        MockMvc mockMvc = buildMockMvc(Lane.VIDEO, jobService);

        // HEAVY 한도(50MB)는 넘지만 VIDEO 한도(1GB)엔 한참 못 미치는 크기 — 106이 고치려던 실제 버그.
        MockMultipartFile clip = new MockMultipartFile(
                "files", "clip.mp4", "video/mp4", new byte[(int) (HEAVY_MAX_FILE_SIZE_BYTES + 1)]);

        mockMvc.perform(multipart("/api/v1/tools/test-module/upload").file(clip))
                .andExpect(status().isAccepted());
    }

    @Test
    void 처리_레인은_HEAVY지만_업로드_크기_레인이_VIDEO인_모듈은_VIDEO_한도를_따른다() throws Exception {
        // video-metadata 실사용 회귀: ffprobe만 써서 동시성은 HEAVY 레인을 쓰지만(getLane), 힙 위험이
        // 없어 업로드 크기는 VIDEO 기준이어야 한다(getUploadSizeLane). getLane()만 보고 판정하면
        // 이 모듈이 조용히 HEAVY 50MB 캡에 걸린다 — 실제로 발생했던 버그.
        JobService jobService = mock(JobService.class);
        when(jobService.create(any(), any(), any(), any(), any(), any())).thenReturn(mock(Job.class));
        MockMvc mockMvc = buildMockMvc(Lane.HEAVY, Lane.VIDEO, jobService);

        MockMultipartFile clip = new MockMultipartFile(
                "files", "clip.mp4", "video/mp4", new byte[(int) (HEAVY_MAX_FILE_SIZE_BYTES + 1)]);

        mockMvc.perform(multipart("/api/v1/tools/test-module/upload").file(clip))
                .andExpect(status().isAccepted());
    }
}
