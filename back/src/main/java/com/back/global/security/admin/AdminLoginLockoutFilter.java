package com.back.global.security.admin;

import com.back.global.exception.ErrorCode;
import com.back.global.ratelimit.ClientIpResolver;
import com.back.global.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * /admin/** 요청 진입 시점에 해당 IP가 브루트포스 잠금 상태인지 먼저 확인한다.
 * BasicAuthenticationFilter보다 앞에 걸어서, 잠긴 IP는 자격증명 검증 자체를 시도하지 않고 바로 거절한다.
 */
@Component
@RequiredArgsConstructor
public class AdminLoginLockoutFilter extends OncePerRequestFilter {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final AdminLoginAttemptTracker tracker;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        if (request.getRequestURI().startsWith("/admin/") && tracker.isLockedOut(ClientIpResolver.resolve(request))) {
            response.setStatus(ErrorCode.ADMIN_LOGIN_LOCKED.getStatus().value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(OBJECT_MAPPER.writeValueAsString(ErrorResponse.of(ErrorCode.ADMIN_LOGIN_LOCKED)));
            return;
        }
        filterChain.doFilter(request, response);
    }
}
