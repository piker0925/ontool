package com.back.job.controller;

import com.back.AbstractMySQLIntegrationTest;
import com.back.global.security.jwt.JwtProvider;
import com.back.job.entity.Job;
import com.back.job.entity.JobStatus;
import com.back.job.repository.JobRepository;
import com.back.user.entity.AuthProvider;
import com.back.user.entity.User;
import com.back.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000"
})
class JobHistoryControllerTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;
    @Autowired
    UserRepository userRepository;
    @Autowired
    JobRepository jobRepository;
    @Autowired
    JwtProvider jwtProvider;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        userRepository.deleteAll();
        jobRepository.deleteAll();
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @Test
    void 인증없이_요청하면_401() throws Exception {
        mockMvc.perform(get("/api/v1/users/me/jobs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 만료전_완료된_Job은_다운로드링크와_함께_이력에_나타난다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "h1", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        saveJob(user.getId(), "sha256", JobStatus.DONE, "result-key-1", LocalDateTime.now().plusHours(1));

        mockMvc.perform(get("/api/v1/users/me/jobs").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].moduleId").value("sha256"))
                .andExpect(jsonPath("$.content[0].status").value("DONE"))
                .andExpect(jsonPath("$.content[0].expired").value(false))
                .andExpect(jsonPath("$.content[0].downloadUrl").isNotEmpty());
    }

    @Test
    void 만료된_Job은_다운로드링크_없이_만료_표시로_이력에_남는다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "h2", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        // TTL 지나 파일은 스케줄러가 지웠지만(050 정책) row는 남아있는 상태를 흉내낸다.
        saveJob(user.getId(), "sha256", JobStatus.DONE, "result-key-2", LocalDateTime.now().minusHours(1));

        mockMvc.perform(get("/api/v1/users/me/jobs").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].expired").value(true))
                .andExpect(jsonPath("$.content[0].downloadUrl").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void 최신순으로_정렬되어_반환된다() throws Exception {
        User user = userRepository.save(new User(AuthProvider.GOOGLE, "h3", null, "유저"));
        String token = jwtProvider.issueAccessToken(user.getId());
        saveJob(user.getId(), "old-job", JobStatus.DONE, null, LocalDateTime.now().plusHours(1));
        Thread.sleep(5);
        saveJob(user.getId(), "new-job", JobStatus.DONE, null, LocalDateTime.now().plusHours(1));

        mockMvc.perform(get("/api/v1/users/me/jobs").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.content[0].moduleId").value("new-job"))
                .andExpect(jsonPath("$.content[1].moduleId").value("old-job"));
    }

    @Test
    void 다른_유저의_이력은_보이지_않고_익명_Job도_섞이지_않는다() throws Exception {
        User userA = userRepository.save(new User(AuthProvider.GOOGLE, "h4", null, "A"));
        User userB = userRepository.save(new User(AuthProvider.GOOGLE, "h5", null, "B"));
        String tokenA = jwtProvider.issueAccessToken(userA.getId());
        saveJob(userA.getId(), "a-job", JobStatus.DONE, null, LocalDateTime.now().plusHours(1));
        saveJob(userB.getId(), "b-job", JobStatus.DONE, null, LocalDateTime.now().plusHours(1));
        saveJob(null, "anon-job", JobStatus.DONE, null, LocalDateTime.now().plusHours(1));

        mockMvc.perform(get("/api/v1/users/me/jobs").header("Authorization", "Bearer " + tokenA))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].moduleId").value("a-job"));
    }

    private void saveJob(Long userId, String moduleId, JobStatus status, String resultKey, LocalDateTime expiresAt) {
        Job job = new Job();
        job.setUserId(userId);
        job.setModuleId(moduleId);
        job.setStatus(status);
        job.setResultKey(resultKey);
        job.setExpiresAt(expiresAt);
        jobRepository.save(job);
    }
}
