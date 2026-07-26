package com.back.global.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * springdoc-openapi 문서 메타데이터(184) — Swagger UI 상단에 노출되는 프로젝트 소개.
 * 포트폴리오 목적상 면접관이 /swagger-ui.html만 봐도 프로젝트 구조를 파악할 수 있게 한국어로 작성한다.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("OnTool · 온툴 API")
                        .description("""
                                개발자 도구 · 파일·문서 · 생활 도구 · 게임 4개 구역을 담은 종합 도구 포털의 백엔드 API입니다.

                                - Job/Batch: 대용량·오래 걸리는 변환 작업(이미지→PDF, PDF 병합 등)을 큐에 넣고 \
                                폴링·SSE로 진행 상황을 추적하는 비동기 처리 API
                                - Tool: 도구 모듈 목록 조회, 즉시 실행(Light) / 업로드 후 비동기 실행(Heavy) 라우팅
                                - Admin: 통계·신고·회원 관리 등 운영자 전용 API (HTTP Basic 또는 관리자 권한 필요)
                                - Comment/Stats/Suggestion: 댓글, 사용·좋아요 통계, 건의사항 등 소셜 기능
                                """)
                        .version("v1")
                        .contact(new Contact().name("OnTool").url("https://github.com/piker0925/ontool"))
                        .license(new License().name("MIT").url("https://opensource.org/licenses/MIT")));
    }
}
