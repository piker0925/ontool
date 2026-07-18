package com.back;

import com.back.global.security.jwt.JwtProvider;
import com.back.job.entity.Job;
import com.back.job.repository.JobRepository;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Job 생성 시 로그인 사용자의 userId가 기록되는지(050) — springSecurity()를 적용해야 JWT를 실제로
 * 검증하므로, 이 필터 적용이 무관한 테스트(예: path traversal 400/404 차이)에 영향을 주지 않도록
 * ToolAndJobApiTest와 분리된 전용 파일로 둔다.
 */
@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=300",
        "scheduling.ttl.delay=60000"
})
@Import(ToolAndJobApiTest.TestModules.class)
class JobHistoryUploadTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    JobRepository jobRepository;
    @Autowired
    UserRepository userRepository;
    @Autowired
    JwtProvider jwtProvider;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        jobRepository.deleteAll();
    }

    @Test
    void uploadHeavyTool_로그인상태면_Job에_userId가_기록된다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "job-history-1", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        MockMultipartFile file = new MockMultipartFile("files", "test.txt", "text/plain", "data".getBytes());

        String resp = mockMvc.perform(multipart("/api/v1/tools/heavy-echo/upload").file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        String jobId = JsonPath.read(resp, "$.jobId");

        Job job = jobRepository.findById(jobId).orElseThrow();
        assertThat(job.getUserId()).isEqualTo(user.getId());
    }

    @Test
    void uploadHeavyTool_비로그인이면_Job의_userId가_null이다() throws Exception {
        MockMultipartFile file = new MockMultipartFile("files", "test.txt", "text/plain", "data".getBytes());

        String resp = mockMvc.perform(multipart("/api/v1/tools/heavy-echo/upload").file(file))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        String jobId = JsonPath.read(resp, "$.jobId");

        Job job = jobRepository.findById(jobId).orElseThrow();
        assertThat(job.getUserId()).isNull();
    }
}
