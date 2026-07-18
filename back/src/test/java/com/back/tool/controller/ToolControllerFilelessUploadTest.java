package com.back.tool.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.job.repository.JobRepository;
import com.back.tool.model.ToolInput;
import com.back.tool.model.ToolModule;
import com.back.tool.model.ToolResult;
import com.jayway.jsonpath.JsonPath;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.io.ByteArrayOutputStream;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 086: ToolController.upload()가 파일 0개 요청을 받아들이도록 넓힌 변경의 수용 기준·회귀 테스트.
 * - 파일이 필요 없는 모듈(예: invoice-generator류)이 파일 0개로도 정상 처리되는지(AC1)
 * - 파일이 실제로 필요한 기존 모듈(pdf-merge)이 파일 0개면 명확히 FAILED되는지, 조용히 성공하지
 *   않는지(AC2, 같은 모듈이 유효한 입력에서는 여전히 DONE으로 가는 대조군과 짝지어 검증)
 * - acceptsMultipleFiles=true 모듈이 여러 파일을 배치가 아닌 단일 Job으로 묶는 기존 동작(AC4)
 * 파일 1개(AC3)·acceptsMultipleFiles=false 배치(AC5) 회귀는 기존 {@link com.back.ToolAndJobApiTest}가
 * 이미 커버한다.
 */
@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads-fileless",
        "scheduling.worker.delay=200",
        "scheduling.ttl.delay=200"
})
@Import(ToolControllerFilelessUploadTest.TestModules.class)
class ToolControllerFilelessUploadTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    JobRepository jobRepository;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).build();
        jobRepository.deleteAll();
    }

    @Test
    void 파일_0개로_파일불필요_모듈을_호출하면_Job이_생성되고_DONE까지_처리된다() throws Exception {
        String resp = mockMvc.perform(multipart("/api/v1/tools/fileless-echo/upload")
                        .param("greeting", "hi"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").exists())
                .andReturn().getResponse().getContentAsString();
        String jobId = JsonPath.read(resp, "$.jobId");

        await().atMost(10, SECONDS).until(() -> {
            String s = mockMvc.perform(get("/api/v1/jobs/" + jobId))
                    .andReturn().getResponse().getContentAsString();
            return "DONE".equals(JsonPath.read(s, "$.status"));
        });

        mockMvc.perform(get("/api/v1/jobs/" + jobId + "/result"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("fileless-ok:hi"));
    }

    @Test
    void 파일_0개로_pdf병합을_호출하면_FAILED되고_유효한_파일이_있으면_같은_모듈이_DONE된다() throws Exception {
        // 대조군 없는 FAILED는 "이 모듈은 항상 실패"와 구분되지 않는다 — 유효 입력과 짝지어 검증한다.
        String failResp = mockMvc.perform(multipart("/api/v1/tools/pdf-merge/upload"))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        String failJobId = JsonPath.read(failResp, "$.jobId");

        MockMultipartFile validPdf = new MockMultipartFile("files", "a.pdf", "application/pdf", minimalPdfBytes());
        String okResp = mockMvc.perform(multipart("/api/v1/tools/pdf-merge/upload").file(validPdf))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        String okJobId = JsonPath.read(okResp, "$.jobId");

        await().atMost(10, SECONDS).until(() ->
                isTerminal(failJobId) && isTerminal(okJobId));

        assertThat(jobRepository.findById(failJobId).orElseThrow().getStatus().name())
                .as("파일 0개로 호출된 pdf-merge는 조용히 성공하면 안 된다")
                .isEqualTo("FAILED");
        assertThat(jobRepository.findById(okJobId).orElseThrow().getStatus().name())
                .as("유효한 PDF가 있으면 같은 모듈이 정상 처리되어야 한다 (모듈 자체가 항상 실패하는 게 아님을 증명)")
                .isEqualTo("DONE");
    }

    @Test
    void 파일_0개로_단일파일_모듈을_호출하면_Job이_FAILED로_끝난다() throws Exception {
        // 라우팅이 넓어지며 acceptsMultipleFiles=false인 단일 파일 모듈(image-resize)도 파일 0개로
        // 호출 가능해졌다 — requireFiles 가드가 없으면 files.get(0)에서 IndexOutOfBoundsException이
        // 던져지고, JobWorker의 광범위 catch(Exception)이 잡아 FAILED로 끝나긴 하지만 명확한 에러가
        // 아니었다. 이제는 명확한 ToolProcessingException으로 거부되고, 그 결과가 실제로 Job
        // 상태(FAILED)까지 깔끔하게 반영되는지 컨트롤러~워커 전체 스택으로 확인한다.
        String resp = mockMvc.perform(multipart("/api/v1/tools/image-resize/upload"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").exists())
                .andReturn().getResponse().getContentAsString();
        String jobId = JsonPath.read(resp, "$.jobId");

        await().atMost(10, SECONDS).until(() -> isTerminal(jobId));

        assertThat(jobRepository.findById(jobId).orElseThrow().getStatus().name())
                .isEqualTo("FAILED");
    }

    @Test
    void 여러_파일과_acceptsMultipleFiles모듈이면_배치가_아니라_단일_Job이다() throws Exception {
        MockMultipartFile f1 = new MockMultipartFile("files", "a.pdf", "application/pdf", minimalPdfBytes());
        MockMultipartFile f2 = new MockMultipartFile("files", "b.pdf", "application/pdf", minimalPdfBytes());

        String resp = mockMvc.perform(multipart("/api/v1/tools/pdf-merge/upload").file(f1).file(f2))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").exists())
                .andExpect(jsonPath("$.batchId").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String jobId = JsonPath.read(resp, "$.jobId");

        await().atMost(10, SECONDS).until(() -> {
            String s = mockMvc.perform(get("/api/v1/jobs/" + jobId))
                    .andReturn().getResponse().getContentAsString();
            return "DONE".equals(JsonPath.read(s, "$.status"));
        });
    }

    private boolean isTerminal(String jobId) {
        try {
            String status = JsonPath.read(
                    mockMvc.perform(get("/api/v1/jobs/" + jobId)).andReturn().getResponse().getContentAsString(),
                    "$.status");
            return "DONE".equals(status) || "FAILED".equals(status);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static byte[] minimalPdfBytes() {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.addPage(new PDPage());
            doc.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @TestConfiguration
    static class TestModules {
        @Bean
        ToolModule filelessEcho() {
            return new ToolModule() {
                public String getId() { return "fileless-echo"; }
                public String getName() { return "Fileless Echo"; }
                public String getCategory() { return "test"; }
                public boolean isHeavy() { return true; }
                public ToolResult process(ToolInput input) {
                    if (!input.files().isEmpty()) {
                        throw new IllegalStateException("파일이 없어야 하는 모듈에 파일이 전달됨: " + input.files());
                    }
                    String greeting = input.params().getOrDefault("greeting", "");
                    return ToolResult.ofText("fileless-ok:" + greeting);
                }
            };
        }
    }
}
