package com.back.adminactionlog.service;

import com.back.adminactionlog.entity.AdminActionLog;
import com.back.adminactionlog.entity.AdminActionType;
import com.back.adminactionlog.repository.AdminActionLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminActionLogServiceTest {

    @Mock
    AdminActionLogRepository adminActionLogRepository;

    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-07-21T00:00:00Z"), ZoneOffset.UTC);
    private static final LocalDateTime NOW = LocalDateTime.now(FIXED_CLOCK);

    private AdminActionLogService adminActionLogService;

    @BeforeEach
    void setUp() {
        adminActionLogService = new AdminActionLogService(adminActionLogRepository, FIXED_CLOCK);
    }

    @Test
    void record_FORCE_LOGOUT를_정확한_actionType과_targetId로_저장한다() {
        adminActionLogService.record(AdminActionType.FORCE_LOGOUT, 42L);

        ArgumentCaptor<AdminActionLog> captor = ArgumentCaptor.forClass(AdminActionLog.class);
        verify(adminActionLogRepository).save(captor.capture());

        AdminActionLog saved = captor.getValue();
        assertThat(saved.getActionType()).isEqualTo(AdminActionType.FORCE_LOGOUT);
        assertThat(saved.getTargetId()).isEqualTo(42L);
        assertThat(saved.getPerformedAt()).isEqualTo(NOW);
    }

    @Test
    void record_COMMENT_DELETE를_정확한_actionType과_targetId로_저장한다() {
        adminActionLogService.record(AdminActionType.COMMENT_DELETE, 7L);

        ArgumentCaptor<AdminActionLog> captor = ArgumentCaptor.forClass(AdminActionLog.class);
        verify(adminActionLogRepository).save(captor.capture());

        AdminActionLog saved = captor.getValue();
        assertThat(saved.getActionType()).isEqualTo(AdminActionType.COMMENT_DELETE);
        assertThat(saved.getTargetId()).isEqualTo(7L);
    }

    @Test
    void findRecent_repository_조회_결과를_그대로_위임한다() {
        AdminActionLog log = new AdminActionLog(AdminActionType.FORCE_LOGOUT, 1L, NOW);
        Page<AdminActionLog> page = new PageImpl<>(java.util.List.of(log));
        when(adminActionLogRepository.findAll(any(Pageable.class))).thenReturn(page);

        Page<AdminActionLog> result = adminActionLogService.findRecent(0, 20);

        assertThat(result.getContent()).containsExactly(log);
    }

    @Test
    void findRecent_performedAt_내림차순_정렬을_직접_조립해서_repository에_넘긴다() {
        // 정렬 규칙(최신순)은 이 서비스의 계약이다 — 호출부(컨트롤러)가 Sort를 다시 조립하게
        // 두면 "시간순으로 보인다"는 AC가 호출부마다 따로 지켜야 하는 약속이 되어버린다.
        // 그래서 서비스가 만든 Pageable에 실제로 올바른 Sort가 들어있는지까지 검증한다.
        when(adminActionLogRepository.findAll(any(Pageable.class))).thenReturn(Page.empty());

        adminActionLogService.findRecent(1, 10);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(adminActionLogRepository).findAll(captor.capture());

        Pageable used = captor.getValue();
        assertThat(used.getPageNumber()).isEqualTo(1);
        assertThat(used.getPageSize()).isEqualTo(10);
        Sort.Order performedAtOrder = used.getSort().getOrderFor("performedAt");
        Sort.Order idOrder = used.getSort().getOrderFor("id");
        assertThat(performedAtOrder).isNotNull();
        assertThat(performedAtOrder.getDirection()).isEqualTo(Sort.Direction.DESC);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);
    }
}
