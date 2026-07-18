package com.back.global.security.admin;

import com.back.global.ratelimit.ClientIpResolver;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * httpBasic()의 AuthenticationEntryPoint — /admin/** Basic Auth 실패 시 브루트포스 카운트를 기록한다.
 * <p>
 * AuthenticationFailureBadCredentialsEvent + RequestContextHolder 조합은 처음 시도했으나 버렸다:
 * 실제 서블릿 컨테이너에서는 BasicAuthenticationFilter가 DispatcherServlet에 도달하기 전에 실패를
 * 확정하므로(요청이 서블릿까지 안 감), 이벤트 발행 시점에 RequestContextHolder가 비어 있을 수 있어
 * "조용히 아무것도 기록 안 함"으로 fail-open할 위험이 있었다. 이 EntryPoint는 BasicAuthenticationFilter가
 * 인증 실패를 잡은 그 자리에서 request를 직접 받아 호출되므로 이 문제가 없다.
 * <p>
 * BadCredentialsException(아이디·비번이 실제로 틀림)만 기록한다 — 자격증명 자체를 안 보낸 접근
 * (봇·크롤러가 인증 헤더 없이 /admin을 두드리는 흔한 트래픽)까지 실패로 세면 무고한 접속으로도
 * 잠금이 쌓여 관리자 본인이 잠길 수 있다.
 * <p>
 * IP는 반드시 ClientIpResolver로만 구한다 — AdminLoginLockoutFilter의 확인 쪽도 같은 리졸버를 쓰므로
 * 기록 키와 확인 키가 항상 같은 방식으로 계산된다(다르면 잠금이 영영 안 걸리거나, nginx IP 하나에
 * 모든 클라이언트의 실패가 뒤섞여 한 공격자가 전체 관리자를 잠가버릴 수 있다).
 */
@Component
@RequiredArgsConstructor
public class AdminAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private static final String REALM = "admin";

    private final AdminLoginAttemptTracker tracker;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                          AuthenticationException authException) throws IOException, ServletException {
        if (authException instanceof BadCredentialsException) {
            tracker.recordFailure(ClientIpResolver.resolve(request));
        }
        response.addHeader("WWW-Authenticate", "Basic realm=\"" + REALM + "\"");
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, authException.getMessage());
    }
}
