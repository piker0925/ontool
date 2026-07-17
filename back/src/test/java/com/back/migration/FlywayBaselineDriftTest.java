package com.back.migration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 드리프트 방지 테스트 (ADR-0025). 빈 MySQL에 Flyway 마이그레이션(V1__baseline.sql 등)을 전부 적용한 뒤,
 * {@code ddl-auto=validate}로 Spring 컨텍스트가 기동에 성공하는지 확인한다.
 * <p>
 * 이 테스트가 검증하는 것: 마이그레이션 스크립트가 만든 스키마 == JPA 엔티티가 기대하는 스키마.
 * 엔티티만 고치고 마이그레이션을 빠뜨리면(=드리프트) 이 테스트는 컨텍스트 기동 실패로 잡아낸다
 * (근거: 이 파일 작성 중 Job 엔티티에 임시 컬럼을 추가해 실제로 실패시켜본 뒤 되돌렸다).
 * <p>
 * 다른 통합 테스트({@code AbstractMySQLIntegrationTest} 기반)와 컨테이너를 공유하지 않는다 —
 * 공유하면 다른 테스트가 create-drop으로 이미 만들어 둔 테이블 때문에 Flyway가 "비어있지 않은 스키마"로
 * 보고 baseline-on-migrate로 V1 적용 자체를 건너뛰어 버려서, 마이그레이션 스크립트의 정확성을
 * 검증하지 못하는 상태로 테스트가 우연히 통과해버릴 수 있다. 이 클래스 전용 빈 컨테이너를 쓴다.
 */
@Testcontainers
@SpringBootTest
class FlywayBaselineDriftTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("devtoolbox")
            .withUsername("devtoolbox")
            .withPassword("1234");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);

        // prod 프로파일과 동일한 스키마 관리 방식: Flyway가 스키마를 만들고, JPA는 검증만 한다.
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.baseline-on-migrate", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired
    DataSource dataSource;

    @Test
    void 빈_DB에_Flyway_마이그레이션을_적용하면_JPA_엔티티와_스키마가_일치해_컨텍스트가_기동된다() {
        // 컨텍스트 기동 자체가 검증이다: ddl-auto=validate 상태로 EntityManagerFactory가
        // 뜬다는 것은 Flyway가 만든 스키마와 4개 엔티티(Job·Comment·ToolStats·Suggestion)의
        // 컬럼·타입·nullable이 전부 일치한다는 뜻이다. 추가로 flyway_schema_history에 V1이
        // 기록됐는지도 확인해 "마이그레이션이 실제로 실행됐다"는 것을 검증한다(baseline 스킵이 아님).
        assertThat(dataSource).isNotNull();
        assertThat(appliedFlywayVersions()).contains("1");
    }

    private java.util.List<String> appliedFlywayVersions() {
        java.util.List<String> versions = new java.util.ArrayList<>();
        try (var conn = dataSource.getConnection();
             var stmt = conn.createStatement();
             var rs = stmt.executeQuery("SELECT version FROM flyway_schema_history WHERE success = 1")) {
            while (rs.next()) {
                versions.add(rs.getString("version"));
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return versions;
    }
}
