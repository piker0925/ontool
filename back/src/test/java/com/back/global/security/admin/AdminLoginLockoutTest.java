package com.back.global.security.admin;

import com.back.AbstractMySQLIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 관리자 Basic Auth 브루트포스 방어 통합 테스트. IP는 X-Real-IP 헤더(ClientIpResolver가 우선 신뢰)로
 * 시뮬레이션해서 실패 카운트가 IP별로 격리되는지까지 함께 확인한다.
 */
@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=60000",
        "scheduling.ttl.delay=60000",
        "admin.login.max-failures=3",
        "admin.login.lockout-window-seconds=300"
})
class AdminLoginLockoutTest extends AbstractMySQLIntegrationTest {

    @Autowired
    WebApplicationContext wac;

    MockMvc mockMvc;

    @Test
    void 실패한_로그인이_한도를_넘으면_이후_요청은_올바른_비번이어도_잠긴다() throws Exception {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        String ip = "10.0.0.1";

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(get("/admin/stats").header("X-Real-IP", ip).with(httpBasic("admin", "wrong")))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(get("/admin/stats").header("X-Real-IP", ip).with(httpBasic("admin", "1234")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("ADMIN_LOGIN_LOCKED"));
    }

    @Test
    void 다른_IP의_실패는_영향을_주지_않는다() throws Exception {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        String attackerIp = "10.0.0.2";
        String legitIp = "10.0.0.3";

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(get("/admin/stats").header("X-Real-IP", attackerIp).with(httpBasic("admin", "wrong")))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(get("/admin/stats").header("X-Real-IP", legitIp).with(httpBasic("admin", "1234")))
                .andExpect(status().isOk());
    }

    @Test
    void 실패_횟수가_한도_미만이면_올바른_비번으로_정상_로그인된다() throws Exception {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        String ip = "10.0.0.4";

        mockMvc.perform(get("/admin/stats").header("X-Real-IP", ip).with(httpBasic("admin", "wrong")))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/admin/stats").header("X-Real-IP", ip).with(httpBasic("admin", "1234")))
                .andExpect(status().isOk());
    }
}
