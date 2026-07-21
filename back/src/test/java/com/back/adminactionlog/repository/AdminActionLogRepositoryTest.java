package com.back.adminactionlog.repository;

import com.back.AbstractMySQLIntegrationTest;
import com.back.adminactionlog.entity.AdminActionLog;
import com.back.adminactionlog.entity.AdminActionType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class AdminActionLogRepositoryTest extends AbstractMySQLIntegrationTest {

    @Autowired
    AdminActionLogRepository adminActionLogRepository;

    @BeforeEach
    void cleanup() {
        adminActionLogRepository.deleteAll();
    }

    @Test
    void findAll_performedAt_내림차순_정렬시_가장_최근_기록이_먼저_온다() {
        // Clock을 고정하면 세 row가 전부 같은 timestamp를 갖게 되어, id-desc tie-break 때문에
        // "performedAt으로 정렬됨"과 "그냥 삽입 역순임"을 구분할 수 없다 — 그래서 서로 다른
        // performedAt 값을 엔티티 생성자에 직접 넣어 실제 시간순 정렬을 검증한다.
        LocalDateTime oldest = LocalDateTime.of(2026, 7, 19, 10, 0);
        LocalDateTime middle = LocalDateTime.of(2026, 7, 20, 10, 0);
        LocalDateTime newest = LocalDateTime.of(2026, 7, 21, 10, 0);

        // 일부러 시간순이 아닌 순서로 저장한다 — insertion order를 따르면 안 되고 performedAt을 따라야 한다.
        adminActionLogRepository.save(new AdminActionLog(AdminActionType.FORCE_LOGOUT, 1L, middle));
        adminActionLogRepository.save(new AdminActionLog(AdminActionType.COMMENT_DELETE, 2L, newest));
        adminActionLogRepository.save(new AdminActionLog(AdminActionType.FORCE_LOGOUT, 3L, oldest));

        Pageable pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "performedAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<AdminActionLog> page = adminActionLogRepository.findAll(pageable);

        assertThat(page.getContent())
                .extracting(AdminActionLog::getTargetId)
                .containsExactly(2L, 1L, 3L);
    }

    @Test
    void save_actionType과_targetId가_실제_값_그대로_저장된다() {
        AdminActionLog saved = adminActionLogRepository.save(
                new AdminActionLog(AdminActionType.COMMENT_DELETE, 99L, LocalDateTime.of(2026, 7, 21, 12, 0)));

        AdminActionLog found = adminActionLogRepository.findById(saved.getId()).orElseThrow();

        assertThat(found.getActionType()).isEqualTo(AdminActionType.COMMENT_DELETE);
        assertThat(found.getTargetId()).isEqualTo(99L);
        assertThat(found.getPerformedAt()).isEqualTo(LocalDateTime.of(2026, 7, 21, 12, 0));
    }
}
