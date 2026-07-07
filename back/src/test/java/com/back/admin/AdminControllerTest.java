package com.back.admin;

import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Testcontainers
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "storage.upload-dir=build/test-uploads",
        "scheduling.worker.delay=300",
        "scheduling.ttl.delay=60000"
})
class AdminControllerTest {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("devtoolbox")
            .withUsername("devtoolbox")
            .withPassword("1234");

    @Autowired
    WebApplicationContext wac;
    @Autowired
    CommentRepository commentRepository;

    MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(springSecurity())
                .build();
    }

    @Test
    void getStats_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/admin/stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getStats_withAuth_returns200() throws Exception {
        mockMvc.perform(get("/admin/stats")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk());
    }

    @Test
    void getSuggestions_withAuth_returns200() throws Exception {
        mockMvc.perform(get("/admin/suggestions")
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isOk());
    }

    @Test
    void deleteComment_withAuth_returns204() throws Exception {
        Comment comment = new Comment();
        comment.setModuleId("test-module");
        comment.setContent("test content");
        Comment saved = commentRepository.save(comment);

        mockMvc.perform(delete("/admin/comments/" + saved.getId())
                        .with(httpBasic("admin", "1234")))
                .andExpect(status().isNoContent());
    }

    @Test
    void publicApi_withoutAuth_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/modules"))
                .andExpect(status().isOk());
    }
}
