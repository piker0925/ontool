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
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 업로드 파일명은 공격자가 제어할 수 있는 입력이다. "../" 등으로 uploadDir 밖에 쓰기를
 * 시도해도 저장 경로가 항상 uploadDir 내부에 머무는지 검증한다(CodeQL java/path-injection).
 */
class ToolControllerPathTraversalTest {

    private static final String UPLOAD_DIR = "build/test-uploads-pathtraversal";

    private MockMvc buildMockMvc(JobService jobService) {
        ToolService toolService = mock(ToolService.class);
        JobRepository jobRepository = mock(JobRepository.class);
        ToolModule heavyModule = mock(ToolModule.class);
        when(heavyModule.isHeavy()).thenReturn(true);
        when(heavyModule.getLane()).thenReturn(Lane.HEAVY);
        when(toolService.getModule("image-to-pdf")).thenReturn(heavyModule);

        AdmissionControl admissionControl =
                new AdmissionControl(jobRepository, UPLOAD_DIR, 999_999L, 200, 10);
        RateLimiter rateLimiter = new RateLimiter(999_999, 60);

        ToolController controller = new ToolController(
                toolService, jobService, mock(ToolStatsService.class), admissionControl, rateLimiter,
                UPLOAD_DIR,
                50L * 1024 * 1024, 100L * 1024 * 1024, 1024L * 1024 * 1024, 2048L * 1024 * 1024);

        return MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @SuppressWarnings("unchecked")
    void 파일명에_상위디렉터리_이동이_있어도_uploadDir_밖에_쓰지_않는다() throws Exception {
        JobService jobService = mock(JobService.class);
        when(jobService.create(any(), any(), any(), any(), any(), any())).thenReturn(mock(Job.class));
        MockMvc mockMvc = buildMockMvc(jobService);

        MockMultipartFile evil = new MockMultipartFile(
                "files", "../../../../etc/evil.txt", "text/plain", "pwned".getBytes());

        mockMvc.perform(multipart("/api/v1/tools/image-to-pdf/upload").file(evil))
                .andExpect(status().isAccepted());

        ArgumentCaptor<List<String>> pathsCaptor = ArgumentCaptor.forClass(List.class);
        verify(jobService).create(any(), any(), any(), any(), pathsCaptor.capture(), any());

        Path saved = Path.of(pathsCaptor.getValue().get(0)).normalize();
        Path uploadRoot = Path.of(UPLOAD_DIR).toAbsolutePath().normalize();

        assertThat(saved).startsWith(uploadRoot);
        assertThat(saved.getFileName().toString()).isEqualTo("evil.txt");
    }

    @Test
    @SuppressWarnings("unchecked")
    void 파일명이_상위디렉터리_기호뿐이어도_uploadDir_밖에_쓰지_않는다() throws Exception {
        JobService jobService = mock(JobService.class);
        when(jobService.create(any(), any(), any(), any(), any(), any())).thenReturn(mock(Job.class));
        MockMvc mockMvc = buildMockMvc(jobService);

        MockMultipartFile evil = new MockMultipartFile("files", "..", "text/plain", "pwned".getBytes());

        mockMvc.perform(multipart("/api/v1/tools/image-to-pdf/upload").file(evil))
                .andExpect(status().isAccepted());

        ArgumentCaptor<List<String>> pathsCaptor = ArgumentCaptor.forClass(List.class);
        verify(jobService).create(any(), any(), any(), any(), pathsCaptor.capture(), any());

        Path saved = Path.of(pathsCaptor.getValue().get(0)).normalize();
        Path uploadRoot = Path.of(UPLOAD_DIR).toAbsolutePath().normalize();

        assertThat(saved).startsWith(uploadRoot);
        assertThat(saved.getFileName().toString()).isEqualTo("upload");
    }
}
