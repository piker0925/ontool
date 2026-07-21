package com.back.adminactionlog.service;

import com.back.adminactionlog.entity.AdminActionLog;
import com.back.adminactionlog.entity.AdminActionType;
import com.back.adminactionlog.repository.AdminActionLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

/**
 * 관리자 행위 감사로그(058). 관리자 계정이 단일이라 "누가"는 기록하지 않고 "언제 + 무엇을"만 남긴다.
 * <p>
 * 재사용 API: {@link #record(AdminActionType, Long)} 하나만 호출하면 된다 — 지금은 강제 로그아웃·댓글
 * 삭제에서 호출하고, 나중에 회원 정지/해제·계정 강제삭제 기능이 추가되면 그 기능들이 그대로 이 메서드를
 * 호출하기만 하면 되는 구조다(배선은 이 이슈 범위 밖).
 */
@Service
public class AdminActionLogService {

    private final AdminActionLogRepository adminActionLogRepository;
    private final Clock clock;

    @Autowired
    public AdminActionLogService(AdminActionLogRepository adminActionLogRepository) {
        this(adminActionLogRepository, Clock.systemDefaultZone());
    }

    AdminActionLogService(AdminActionLogRepository adminActionLogRepository, Clock clock) {
        this.adminActionLogRepository = adminActionLogRepository;
        this.clock = clock;
    }

    @Transactional
    public void record(AdminActionType actionType, Long targetId) {
        adminActionLogRepository.save(new AdminActionLog(actionType, targetId, LocalDateTime.now(clock)));
    }

    // 최신순(performedAt desc, id desc tie-break) 정렬은 이 서비스가 보장하는 계약의 일부다 —
    // 호출부(컨트롤러)가 매번 Sort를 다시 조립하게 하면 "시간순으로 보인다"는 AC가 호출부마다
    // 따로 지켜야 하는 약속이 되어버린다. UserService.search와 동일한 패턴.
    @Transactional(readOnly = true)
    public Page<AdminActionLog> findRecent(int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "performedAt").and(Sort.by(Sort.Direction.DESC, "id")));
        return adminActionLogRepository.findAll(pageable);
    }
}
