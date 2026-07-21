package com.back.tool.controller;

import com.back.job.service.AdmissionControl;
import com.back.job.repository.JobRepository;
import com.back.job.service.JobService;
import com.back.global.ratelimit.RateLimiter;
import com.back.tool.model.Lane;
import com.back.tool.model.ToolModule;
import com.back.stats.service.ToolStatsService;
import com.back.tool.service.ToolService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/v1/modules가 모듈별 실제 업로드 한도(106)를 내려주는지 — 프론트가 하드코딩 없이
 * 이 값을 읽어 클라이언트 사전검증에 쓴다. HEAVY와 VIDEO 모듈이 서로 다른 값을 받아야 한다.
 */
class ToolControllerModuleLimitsTest {

    private static final long HEAVY_MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024;
    private static final long HEAVY_MAX_REQUEST_SIZE_BYTES = 100L * 1024 * 1024;
    private static final long VIDEO_MAX_FILE_SIZE_BYTES = 1024L * 1024 * 1024;
    private static final long VIDEO_MAX_REQUEST_SIZE_BYTES = 2048L * 1024 * 1024;

    private MockMvc buildMockMvc(ToolModule... modules) {
        ToolService toolService = mock(ToolService.class);
        when(toolService.listModules()).thenReturn(List.of(modules));

        AdmissionControl admissionControl =
                new AdmissionControl(mock(JobRepository.class), "build/test-uploads-modulelimits", 999_999_999L, 200, 10);
        RateLimiter rateLimiter = new RateLimiter(999_999, 60);

        ToolController controller = new ToolController(
                toolService, mock(JobService.class), mock(ToolStatsService.class), admissionControl, rateLimiter,
                "build/test-uploads-modulelimits",
                HEAVY_MAX_FILE_SIZE_BYTES, HEAVY_MAX_REQUEST_SIZE_BYTES,
                VIDEO_MAX_FILE_SIZE_BYTES, VIDEO_MAX_REQUEST_SIZE_BYTES);

        return MockMvcBuilders.standaloneSetup(controller).build();
    }

    private static ToolModule moduleOf(String id, Lane lane) {
        ToolModule m = mock(ToolModule.class);
        when(m.getId()).thenReturn(id);
        when(m.getName()).thenReturn(id);
        when(m.getCategory()).thenReturn("test");
        when(m.isHeavy()).thenReturn(true);
        when(m.getLane()).thenReturn(lane);
        when(m.getUploadSizeLane()).thenReturn(lane);
        return m;
    }

    @Test
    void HEAVY와_VIDEO_모듈은_서로_다른_업로드_한도를_내려준다() throws Exception {
        ToolModule heavy = moduleOf("image-resize", Lane.HEAVY);
        ToolModule video = moduleOf("video-metadata", Lane.VIDEO);
        MockMvc mockMvc = buildMockMvc(heavy, video);

        String body = mockMvc.perform(get("/api/v1/modules"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Map<String, Object>> modules = new ObjectMapper().readValue(body, List.class);
        Map<String, Object> heavyResponse = modules.stream()
                .filter(m -> "image-resize".equals(m.get("id"))).findFirst().orElseThrow();
        Map<String, Object> videoResponse = modules.stream()
                .filter(m -> "video-metadata".equals(m.get("id"))).findFirst().orElseThrow();

        assertThat(((Number) heavyResponse.get("maxFileSizeBytes")).longValue()).isEqualTo(HEAVY_MAX_FILE_SIZE_BYTES);
        assertThat(((Number) heavyResponse.get("maxRequestSizeBytes")).longValue()).isEqualTo(HEAVY_MAX_REQUEST_SIZE_BYTES);
        assertThat(((Number) videoResponse.get("maxFileSizeBytes")).longValue()).isEqualTo(VIDEO_MAX_FILE_SIZE_BYTES);
        assertThat(((Number) videoResponse.get("maxRequestSizeBytes")).longValue()).isEqualTo(VIDEO_MAX_REQUEST_SIZE_BYTES);
    }
}
