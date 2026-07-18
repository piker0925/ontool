package com.back.tool.controller;

import com.back.global.exception.GlobalExceptionHandler;
import com.back.global.ratelimit.RateLimiter;
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
 * 업로드 엔드포인트가 용량 게이트(036)를 실제로 통과시키는지 — 예산을 넘겨 거부되면 507이 나가고,
 * 거부 시 Job이 만들어지지 않아야 한다(문 앞 거절).
 */
class ToolControllerAdmissionTest {

    @Test
    void 용량_초과면_507로_거부하고_Job을_만들지_않는다() throws Exception {
        ToolService toolService = mock(ToolService.class);
        JobService jobService = mock(JobService.class);
        JobRepository jobRepository = mock(JobRepository.class);
        ToolModule heavyModule = mock(ToolModule.class);
        when(heavyModule.isHeavy()).thenReturn(true);
        when(heavyModule.getLane()).thenReturn(Lane.HEAVY);
        when(toolService.getModule("image-to-pdf")).thenReturn(heavyModule);

        // 예산 -1 → 사용량(0 이상) > -1 이므로 항상 STORAGE_FULL. 게이트가 호출되기만 하면 거부된다.
        AdmissionControl admissionControl =
                new AdmissionControl(jobRepository, "build/test-uploads-admission", -1L, 200, 10);

        // 한도를 넉넉히 둬 이 테스트의 관심사(admission)와 rate limit이 섞이지 않게 한다.
        RateLimiter rateLimiter = new RateLimiter(1000, 60);

        ToolController controller = new ToolController(
                toolService, jobService, mock(ToolStatsService.class), admissionControl, rateLimiter,
                "build/test-uploads-admission");

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        MockMultipartFile file = new MockMultipartFile("files", "a.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/v1/tools/image-to-pdf/upload").file(file))
                .andExpect(status().isInsufficientStorage()); // 507

        // 거부됐으니 Job 생성으로 넘어가지 않는다.
        verify(jobService, never()).create(any(), any(), any(), any(), any(), any());
    }
}
