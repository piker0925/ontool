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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 업로드 엔드포인트가 IP당 요청 빈도 게이트(040)를 실제로 통과시키는지 — 한도를 넘기면 429가
 * 나가고 Job이 만들어지지 않으며, 다른 IP는 영향받지 않아야 한다(격리).
 */
class ToolControllerRateLimitTest {

    private MockMvc buildMockMvc(RateLimiter rateLimiter, JobService jobService) throws Exception {
        ToolService toolService = mock(ToolService.class);
        JobRepository jobRepository = mock(JobRepository.class);
        ToolModule heavyModule = mock(ToolModule.class);
        when(heavyModule.isHeavy()).thenReturn(true);
        when(heavyModule.getLane()).thenReturn(Lane.HEAVY);
        when(toolService.getModule("image-to-pdf")).thenReturn(heavyModule);

        AdmissionControl admissionControl =
                new AdmissionControl(jobRepository, "build/test-uploads-ratelimit", 999_999L, 200, 10);

        ToolController controller = new ToolController(
                toolService, jobService, mock(ToolStatsService.class), admissionControl, rateLimiter,
                "build/test-uploads-ratelimit",
                50L * 1024 * 1024, 100L * 1024 * 1024, 1024L * 1024 * 1024, 2048L * 1024 * 1024);

        return MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private static MockMultipartFile aFile() {
        return new MockMultipartFile("files", "a.jpg", "image/jpeg", new byte[]{1, 2, 3});
    }

    @Test
    void 한도를_넘으면_429로_거부하고_Job을_만들지_않는다() throws Exception {
        JobService jobService = mock(JobService.class);
        // 한도 0 → 첫 요청부터 바로 초과.
        RateLimiter rateLimiter = new RateLimiter(0, 60);
        MockMvc mockMvc = buildMockMvc(rateLimiter, jobService);

        mockMvc.perform(multipart("/api/v1/tools/image-to-pdf/upload").file(aFile())
                        .header("X-Real-IP", "9.9.9.9"))
                .andExpect(status().isTooManyRequests()) // 429
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        verify(jobService, never()).create(any(), any(), any(), any(), any(), any());
    }

    @Test
    void 한_IP가_한도를_넘어도_다른_IP는_영향받지_않는다() throws Exception {
        JobService jobService = mock(JobService.class);
        when(jobService.create(any(), any(), any(), any(), any(), any())).thenReturn(mock(Job.class));
        RateLimiter rateLimiter = new RateLimiter(1, 60);
        MockMvc mockMvc = buildMockMvc(rateLimiter, jobService);

        // 1.1.1.1: 한도(1)까지 소진 후 초과.
        mockMvc.perform(multipart("/api/v1/tools/image-to-pdf/upload").file(aFile())
                        .header("X-Real-IP", "1.1.1.1"))
                .andExpect(status().isAccepted());
        mockMvc.perform(multipart("/api/v1/tools/image-to-pdf/upload").file(aFile())
                        .header("X-Real-IP", "1.1.1.1"))
                .andExpect(status().isTooManyRequests());

        // 2.2.2.2: 처음 요청이므로 1.1.1.1의 초과와 무관하게 통과해야 한다 — 격리 검증.
        mockMvc.perform(multipart("/api/v1/tools/image-to-pdf/upload").file(aFile())
                        .header("X-Real-IP", "2.2.2.2"))
                .andExpect(status().isAccepted());
    }
}
