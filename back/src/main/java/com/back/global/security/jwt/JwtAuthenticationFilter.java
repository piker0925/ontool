package com.back.global.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// 토큰이 없거나 유효하지 않아도 그대로 통과시킨다 — 익명 기본 원칙(ADR-0024), 인증 필수 여부는
// SecurityConfig의 authorizeHttpRequests가 판단한다.
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final AccessTokenRevocationService accessTokenRevocationService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        BearerTokenExtractor.extract(request).ifPresent(token -> {
            if (!accessTokenRevocationService.isRevoked(token)) {
                jwtProvider.parseUserId(token).ifPresent(userId ->
                        SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(userId, null, List.of())));
            }
        });
        filterChain.doFilter(request, response);
    }
}
