package com.back.global.config;

import com.back.global.exception.ErrorCode;
import com.back.global.response.ErrorResponse;
import com.back.global.security.jwt.JwtAuthenticationFilter;
import com.back.global.security.oauth2.OAuth2LoginFailureHandler;
import com.back.global.security.oauth2.OAuth2LoginSuccessHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
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
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final OAuth2LoginFailureHandler oAuth2LoginFailureHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/admin/**").authenticated()
                .requestMatchers("/api/v1/users/me").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").authenticated()
                .anyRequest().permitAll()
            )
            .exceptionHandling(handling -> handling
                    .defaultAuthenticationEntryPointFor(jsonAuthenticationEntryPoint(), API_REQUEST_MATCHER)
            )
            .httpBasic(Customizer.withDefaults())
            .oauth2Login(oauth2 -> oauth2
                    .successHandler(oAuth2LoginSuccessHandler)
                    .failureHandler(oAuth2LoginFailureHandler)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static final RequestMatcher API_REQUEST_MATCHER = PathPatternRequestMatcher.withDefaults().matcher("/api/v1/**");

    private AuthenticationEntryPoint jsonAuthenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(OBJECT_MAPPER.writeValueAsString(ErrorResponse.of(ErrorCode.UNAUTHORIZED)));
        };
    }
}
