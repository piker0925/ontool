package com.back.global.config;

import com.back.global.exception.ErrorCode;
import com.back.global.response.ErrorResponse;
import com.back.global.security.admin.AdminAuthenticationEntryPoint;
import com.back.global.security.admin.AdminLoginLockoutFilter;
import com.back.global.security.jwt.JwtAuthenticationFilter;
import com.back.global.security.oauth2.OAuth2LoginFailureHandler;
import com.back.global.security.oauth2.OAuth2LoginSuccessHandler;
import com.back.global.security.oauth2.SelectAccountOAuth2AuthorizationRequestResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    // Spring Boot 4의 자동구성 ObjectMapper 빈 타입(Jackson 3 tools.jackson.*)이 이 프로젝트가 쓰는
    // com.fasterxml.jackson과 달라 주입 대상이 없다 — 이 용도로는 별도 인스턴스로 충분해 직접 생성한다.
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AdminLoginLockoutFilter adminLoginLockoutFilter;
    private final AdminAuthenticationEntryPoint adminAuthenticationEntryPoint;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final OAuth2LoginFailureHandler oAuth2LoginFailureHandler;
    private final ClientRegistrationRepository clientRegistrationRepository;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // hasRole: JWT 인증 유저는 권한이 비어있어(JwtAuthenticationFilter) 여기 걸리지 않는다 —
                // 관리자 계정만 갖는 ROLE_ADMIN(spring.security.user.roles)이 있어야 통과한다.
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/users/me").authenticated()
                .requestMatchers("/api/v1/users/me/personalization/**").authenticated()
                .requestMatchers("/api/v1/users/me/jobs").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/comments/*").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").authenticated()
                .anyRequest().permitAll()
            )
            .exceptionHandling(handling -> handling
                    .defaultAuthenticationEntryPointFor(jsonAuthenticationEntryPoint(), API_REQUEST_MATCHER)
            )
            .httpBasic(basic -> basic.authenticationEntryPoint(adminAuthenticationEntryPoint))
            .oauth2Login(oauth2 -> oauth2
                    .authorizationEndpoint(endpoint -> endpoint
                            .authorizationRequestResolver(selectAccountOAuth2AuthorizationRequestResolver())
                    )
                    .successHandler(oAuth2LoginSuccessHandler)
                    .failureHandler(oAuth2LoginFailureHandler)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            // 관리자 Basic Auth 브루트포스 방어(IP별 실패 잠금) — 자격증명 검증 전에 먼저 거른다.
            .addFilterBefore(adminLoginLockoutFilter, BasicAuthenticationFilter.class);
        return http.build();
    }

    private static final RequestMatcher API_REQUEST_MATCHER = PathPatternRequestMatcher.withDefaults().matcher("/api/v1/**");

    @Bean
    public OAuth2AuthorizationRequestResolver selectAccountOAuth2AuthorizationRequestResolver() {
        return new SelectAccountOAuth2AuthorizationRequestResolver(
                new DefaultOAuth2AuthorizationRequestResolver(
                        clientRegistrationRepository,
                        OAuth2AuthorizationRequestRedirectFilter.DEFAULT_AUTHORIZATION_REQUEST_BASE_URI));
    }

    private AuthenticationEntryPoint jsonAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(OBJECT_MAPPER.writeValueAsString(ErrorResponse.of(ErrorCode.UNAUTHORIZED)));
        };
    }
}
