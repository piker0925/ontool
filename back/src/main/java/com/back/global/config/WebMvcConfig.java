package com.back.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${cors.origin:http://localhost:5173}")
    private String corsOrigin;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(corsOrigin.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*") // X-Client-Id(익명 식별 헤더, ADR-0019) 포함 — 쿠키 credentials는 불필요
                .maxAge(3600);
        registry.addMapping("/admin/**")
                .allowedOriginPatterns(corsOrigin.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*") // X-Client-Id(익명 식별 헤더, ADR-0019) 포함 — 쿠키 credentials는 불필요
                .maxAge(3600);
    }
}
