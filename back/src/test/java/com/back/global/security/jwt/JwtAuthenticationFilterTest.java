package com.back.global.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    JwtProvider jwtProvider;
    @Mock
    AccessTokenRevocationService accessTokenRevocationService;
    @Mock
    FilterChain filterChain;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtProvider, accessTokenRevocationService);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void 유효한_토큰이면_인증정보를_SecurityContext에_설정한다() throws Exception {
        when(accessTokenRevocationService.isRevoked("valid-token")).thenReturn(false);
        when(jwtProvider.parseUserId("valid-token")).thenReturn(Optional.of(42L));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid-token");
        HttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(42L);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void 로그아웃으로_무효화된_토큰이면_서명이_유효해도_인증정보를_설정하지_않는다() throws Exception {
        when(accessTokenRevocationService.isRevoked("revoked-token")).thenReturn(true);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer revoked-token");
        HttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(jwtProvider, never()).parseUserId(any());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void 토큰이_없으면_인증정보를_설정하지_않고_통과시킨다() throws Exception {
        HttpServletRequest request = new MockHttpServletRequest();
        HttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void 유효하지_않은_토큰이면_인증정보를_설정하지_않고_통과시킨다() throws Exception {
        when(accessTokenRevocationService.isRevoked("bad-token")).thenReturn(false);
        when(jwtProvider.parseUserId("bad-token")).thenReturn(Optional.empty());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer bad-token");
        HttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }
}
