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
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 108(DB 인덱스 감사) 회귀 가드. FlywayBaselineDriftTest와 같은 이유로 별도 컨테이너를 쓴다 — 다른
 * 테스트는 로컬 프로파일(create-drop, Flyway 비활성)로 뜨기 때문에 Flyway 전용 인덱스가 아예
 * 존재하지 않는 스키마에서 돈다. 여기서는 Flyway로 V9까지 실제로 적용한 뒤 대량(수천 건)으로
 * 데이터를 시딩하고 EXPLAIN으로 옵티마이저가 실제로 그 인덱스를 고르는지 확인한다 — "이론상
 * 필요해 보인다"가 아니라 "행 수가 실제로 있을 때 실행계획이 인덱스를 탄다"를 근거로 남긴다.
 * <p>
 * 빈 테이블에서는 옵티마이저가 인덱스 유무와 무관하게 늘 풀스캔을 고르기 때문에(row 수가 너무 적어
 * 인덱스 탐색 비용이 오히려 더 크다고 판단), 각 테이블에 수천 행을 시딩한 뒤 EXPLAIN을 돌린다.
 */
@Testcontainers
@SpringBootTest
class IndexUsageAuditTest {

    private static final int JOB_ROWS = 50_000;
    private static final int COMMENT_ROWS = 20_000;
    private static final int REFRESH_TOKEN_ROWS = 20_000;
    private static final int REVOKED_TOKEN_ROWS = 20_000;
    private static final int ADMIN_LOG_ROWS = 20_000;

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
        // prod와 동일한 조합: Flyway가 스키마를 만들고(V9까지 전부 적용), JPA는 검증만 한다.
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.baseline-on-migrate", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired
    DataSource dataSource;

    // 클래스 전체에서 1회만 시딩한다(테스트당 6000+행 재시딩은 불필요하게 느림) — 이후 테스트는
    // 전부 읽기 전용(SELECT/EXPLAIN)이라 공유 데이터를 재사용해도 서로 간섭하지 않는다.
    private static boolean seeded = false;

    private void seedIfNeeded() throws Exception {
        if (seeded) {
            return;
        }
        // 한 트랜잭션으로 묶는다 — 시딩 도중 아무 단계에서나 실패하면 그대로 롤백되어, 다음 테스트가
        // seedIfNeeded()를 다시 불렀을 때 "절반만 들어간 상태에서 재시도"로 PK 중복이 나는 대신
        // 깨끗하게 처음부터 다시 시도한다(Testcontainers 앱 계정은 SUPER 권한이 없어 SET GLOBAL 같은
        // 시도가 실패할 수 있는데, 그런 실수가 이후 모든 테스트를 연쇄로 깨뜨리지 않게 하는 안전장치).
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            try {
                seedJobs(conn);
                seedComments(conn);
                seedRefreshTokens(conn);
                seedRevokedAccessTokens(conn);
                seedAdminActionLogs(conn);
                conn.commit();
            } catch (Exception e) {
                conn.rollback();
                throw e;
            }
            // 대량 INSERT 직후에는 InnoDB 퍼시스턴트 통계(innodb_stats_auto_recalc)가 아직
            // 갱신되지 않아 옵티마이저가 "거의 빈 테이블"로 착각하고 인덱스를 걸러버릴 수 있다.
            // 실제 운영 테이블은 이 통계가 이미 안정화된 상태이므로, 시딩 직후 명시적으로 갱신해
            // 그 정상 상태를 흉내낸다.
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ANALYZE TABLE job, comment, refresh_token, revoked_access_token, admin_action_log");
            }
        }
        seeded = true;
    }

    private void seedJobs(Connection conn) throws Exception {
        String sql = "insert into job (id, module_id, batch_id, owner_token, user_id, lane, status, " +
                "created_at, progress, expires_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        String[] lanes = {"HEAVY", "VIDEO"};
        LocalDateTime createdBase = LocalDateTime.now().minusDays(30);
        LocalDateTime now = LocalDateTime.now();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < JOB_ROWS; i++) {
                ps.setString(1, "job-" + i);
                ps.setString(2, "image-to-pdf");
                ps.setString(3, i % 20 == 0 ? "batch-" + (i / 20) : null);
                ps.setString(4, "owner-" + (i % 500));
                if (i % 3 == 0) {
                    ps.setLong(5, 1000 + (i % 300));
                } else {
                    ps.setNull(5, java.sql.Types.BIGINT);
                }
                ps.setString(6, lanes[i % lanes.length]);
                // PENDING/RUNNING은 초 단위로 스쳐가는 과도 상태라 스냅샷 시점엔 소수만 남아있고,
                // DONE/FAILED(완료작)는 회원 Job이 영구 보존되며 계속 누적돼 절대다수를 차지한다 —
                // 균등분포(각 25%)로 시딩하면 TtlCleanupScheduler의 실제 접근 패턴과 어긋난다.
                ps.setString(7, statusFor(i % 100));
                ps.setObject(8, createdBase.plusSeconds(i));
                ps.setInt(9, 0);
                // TtlCleanupScheduler가 60초 간격으로 지난 만료 건을 바로 청소하므로, 실제 운영
                // 테이블에서 "expires_at < now"에 해당하는 행은 극소수(방금 막 넘긴 것들)뿐이고
                // 절대다수는 아직 만료 전(미래)이다 — 그 분포를 그대로 재현한다.
                LocalDateTime expiresAt = (i % 200 == 0)
                        ? now.minusMinutes(1 + (i % 50))
                        : now.plusHours(1).plusSeconds(i);
                ps.setObject(10, expiresAt);
                ps.addBatch();
                if (i % 1000 == 999) {
                    ps.executeBatch();
                }
            }
            ps.executeBatch();
        }
    }

    // 82% DONE, 13% FAILED, 3% PENDING, 2% RUNNING — PENDING/RUNNING은 초~분 단위로 스쳐가는
    // 과도 상태라 스냅샷 시점엔 극소수만 남고, 완료 상태(회원 Job은 영구 보존)가 절대다수를 차지한다.
    private static String statusFor(int bucket) {
        if (bucket < 82) {
            return "DONE";
        }
        if (bucket < 95) {
            return "FAILED";
        }
        if (bucket < 98) {
            return "PENDING";
        }
        return "RUNNING";
    }

    private void seedComments(Connection conn) throws Exception {
        String sql = "insert into comment (module_id, content, created_at) values (?, ?, ?)";
        LocalDateTime base = LocalDateTime.now().minusDays(30);
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < COMMENT_ROWS; i++) {
                ps.setString(1, "module-" + (i % 40));
                ps.setString(2, "content " + i);
                ps.setObject(3, base.plusSeconds(i));
                ps.addBatch();
                if (i % 1000 == 999) {
                    ps.executeBatch();
                }
            }
            ps.executeBatch();
        }
    }

    private void seedRefreshTokens(Connection conn) throws Exception {
        String sql = "insert into refresh_token (user_id, token_hash, expires_at, created_at) values (?, ?, ?, ?)";
        LocalDateTime now = LocalDateTime.now();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < REFRESH_TOKEN_ROWS; i++) {
                ps.setLong(1, 1000 + (i % 300));
                ps.setString(2, "hash-" + i);
                // AuthTokenCleanupScheduler도 같은 60초 주기로 지난 만료 refresh_token을 청소한다 —
                // 실제로 살아있는 행 대부분은 TTL(14일) 안에서 아직 유효(미래)한 상태다.
                LocalDateTime expiresAt = (i % 200 == 0)
                        ? now.minusMinutes(1 + (i % 50))
                        : now.plusDays(14).minusSeconds(i);
                ps.setObject(3, expiresAt);
                ps.setObject(4, now.minusSeconds(i));
                ps.addBatch();
                if (i % 1000 == 999) {
                    ps.executeBatch();
                }
            }
            ps.executeBatch();
        }
    }

    private void seedRevokedAccessTokens(Connection conn) throws Exception {
        String sql = "insert into revoked_access_token (token_hash, expires_at, created_at) values (?, ?, ?)";
        LocalDateTime now = LocalDateTime.now();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < REVOKED_TOKEN_ROWS; i++) {
                ps.setString(1, "rev-hash-" + i);
                // access 토큰 TTL은 30분(jwt.access-token-expiration-seconds=1800) — 블랙리스트에
                // 오른 행 대부분은 그 TTL이 아직 안 지난 상태이고, 지난 것만 정리 대상이 된다.
                LocalDateTime expiresAt = (i % 200 == 0)
                        ? now.minusMinutes(1 + (i % 20))
                        : now.plusMinutes(1 + (i % 29));
                ps.setObject(2, expiresAt);
                ps.setObject(3, now.minusSeconds(i));
                ps.addBatch();
                if (i % 1000 == 999) {
                    ps.executeBatch();
                }
            }
            ps.executeBatch();
        }
    }

    private void seedAdminActionLogs(Connection conn) throws Exception {
        String sql = "insert into admin_action_log (action_type, target_id, performed_at) values (?, ?, ?)";
        String[] types = {"FORCE_LOGOUT", "COMMENT_DELETE"};
        LocalDateTime base = LocalDateTime.now().minusDays(60);
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < ADMIN_LOG_ROWS; i++) {
                ps.setString(1, types[i % types.length]);
                ps.setLong(2, i);
                ps.setObject(3, base.plusSeconds(i * 10L));
                ps.addBatch();
                if (i % 1000 == 999) {
                    ps.executeBatch();
                }
            }
            ps.executeBatch();
        }
    }

    private ExplainRow explain(String sql) throws Exception {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("EXPLAIN " + sql)) {
            assertThat(rs.next()).as("EXPLAIN 결과가 최소 1행 있어야 한다: %s", sql).isTrue();
            return new ExplainRow(rs.getString("key"), rs.getString("type"), rs.getLong("rows"), rs.getString("Extra"));
        }
    }

    private record ExplainRow(String key, String type, long rows, String extra) {
    }

    @Test
    void job_레인별_PENDING_폴링은_lane_status_created_at_인덱스를_탄다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain(
                "SELECT * FROM job WHERE status = 'PENDING' AND lane = 'HEAVY' ORDER BY created_at ASC LIMIT 100");
        assertThat(plan.key()).isEqualTo("idx_job_lane_status_created_at");
        // PENDING은 전체의 3%, 그중 HEAVY 레인은 절반 — 1.5% 안팎으로 걸러져야 인덱스가 효과 있는 것.
        assertThat(plan.rows()).isLessThan(JOB_ROWS / 2);
    }

    @Test
    void job_활성_큐_조회는_status_created_at_인덱스를_탄다() throws Exception {
        // AdminController.getJobs() 기본 필터(DEFAULT_QUEUE_STATUSES = PENDING+RUNNING)와 동일한
        // 모양의 쿼리. 처음엔 TtlCleanupScheduler의 조기만료 대상 조회(status IN (DONE,FAILED))로
        // 이 인덱스를 검증하려 했으나, DONE+FAILED가 시딩 분포상 95%를 차지해 옵티마이저가
        // "행 대부분이 걸리면 인덱스보다 풀스캔이 싸다"고 (정확하게) 판단해 인덱스를 타지 않는
        // 것을 EXPLAIN으로 확인했다 — 그 경로는 인덱스로 득을 보지 못한다는 것 자체가 이 감사의
        // 측정 결과다(아래 job_조기만료_대상_조회는_행_대부분이_걸려_풀스캔이_맞다 참고).
        // 반대로 PENDING+RUNNING은 소수(5%)라 이 인덱스가 실제로 쓰이는 지점이다. (첫 시도였던
        // 15%에서는 이마저도 옵티마이저가 풀스캔을 택했다 — non-covering 인덱스는 매칭 행 비율이
        // 낮아도 PK 재조회 비용 때문에 생각보다 낮은 선택도에서만 이긴다는 것도 이번에 측정으로 확인함.)
        seedIfNeeded();
        ExplainRow plan = explain("SELECT * FROM job WHERE status IN ('PENDING', 'RUNNING')");
        assertThat(plan.key()).isEqualTo("idx_job_status_created_at");
        assertThat(plan.rows()).isLessThan(JOB_ROWS / 2);
    }

    @Test
    void job_조기만료_대상_조회는_행_대부분이_걸려_풀스캔이_맞다() throws Exception {
        // TtlCleanupScheduler.cleanup()의 실제 쿼리. DONE+FAILED가 테이블의 95%를 차지하는 현실적
        // 분포에서는 인덱스 레인지 스캔 후 각 행을 PK로 다시 찾아오는 것보다 클러스터드 인덱스를
        // 그냥 순서대로 훑는 게 더 싸다 — 이 경로는 인덱스를 추가해도 이득이 없다는 게 측정 결과이므로
        // "인덱스가 없다"가 아니라 "옵티마이저가 의도대로 풀스캔을 골랐다"를 회귀 가드로 남긴다.
        seedIfNeeded();
        ExplainRow plan = explain(
                "SELECT * FROM job WHERE status IN ('DONE', 'FAILED') ORDER BY created_at ASC LIMIT 20");
        assertThat(plan.key()).isNull();
        assertThat(plan.type()).isEqualTo("ALL");
    }

    @Test
    void job_TTL_만료_스캔은_expires_at_인덱스를_탄다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain("SELECT * FROM job WHERE expires_at < NOW()");
        assertThat(plan.key()).isEqualTo("idx_job_expires_at");
    }

    @Test
    void job_배치_진행률_조회는_batch_id_인덱스를_탄다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain("SELECT * FROM job WHERE batch_id = 'batch-10'");
        assertThat(plan.key()).isEqualTo("idx_job_batch_id");
        assertThat(plan.rows()).isLessThan(50);
    }

    @Test
    void job_소유자_쿼터_판정은_owner_token_status_인덱스를_탄다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain(
                "SELECT COUNT(*) FROM job WHERE owner_token = 'owner-1' AND status IN ('PENDING', 'RUNNING')");
        assertThat(plan.key()).isEqualTo("idx_job_owner_token_status");
    }

    @Test
    void job_회원_작업이력_조회는_user_id_created_at_인덱스를_탄다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain("SELECT * FROM job WHERE user_id = 1001 ORDER BY created_at DESC LIMIT 20");
        assertThat(plan.key()).isEqualTo("idx_job_user_id_created_at");
    }

    @Test
    void comment_모듈별_댓글_목록은_module_id_created_at_인덱스를_탄다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain("SELECT * FROM comment WHERE module_id = 'module-5' ORDER BY created_at DESC");
        assertThat(plan.key()).isEqualTo("idx_comment_module_id_created_at");
        assertThat(plan.rows()).isLessThan(COMMENT_ROWS / 4);
    }

    @Test
    void refresh_token_만료_정리_스캔은_expires_at_인덱스를_탄다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain("SELECT * FROM refresh_token WHERE expires_at < NOW()");
        assertThat(plan.key()).isEqualTo("idx_refresh_token_expires_at");
    }

    @Test
    void refresh_token_강제로그아웃_삭제는_user_id_인덱스를_탄다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain("DELETE FROM refresh_token WHERE user_id = 1001");
        assertThat(plan.key()).isEqualTo("idx_refresh_token_user_id");
    }

    @Test
    void revoked_access_token_만료_정리_스캔은_expires_at_인덱스를_탄다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain("SELECT * FROM revoked_access_token WHERE expires_at < NOW()");
        assertThat(plan.key()).isEqualTo("idx_revoked_access_token_expires_at");
    }

    @Test
    void admin_action_log_최신순_페이징은_filesort_없이_인덱스_역순_스캔을_쓴다() throws Exception {
        seedIfNeeded();
        ExplainRow plan = explain("SELECT * FROM admin_action_log ORDER BY performed_at DESC, id DESC LIMIT 20");
        assertThat(plan.key()).isEqualTo("idx_admin_action_log_performed_at_id");
        assertThat(plan.extra() == null ? "" : plan.extra()).doesNotContain("Using filesort");
    }
}
