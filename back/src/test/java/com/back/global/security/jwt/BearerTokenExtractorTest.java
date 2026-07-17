package com.back.global.security.jwt;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class BearerTokenExtractorTest {

    @Test
    void Bearer_헤더가_있으면_토큰값을_추출한다() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer abc.def.ghi");

        assertThat(BearerTokenExtractor.extract(request)).contains("abc.def.ghi");
    }

    @Test
    void Authorization_헤더가_없으면_빈값을_반환한다() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThat(BearerTokenExtractor.extract(request)).isEmpty();
    }

    @Test
    void Bearer_접두사가_없으면_빈값을_반환한다() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic abc123");

        assertThat(BearerTokenExtractor.extract(request)).isEmpty();
    }
}
