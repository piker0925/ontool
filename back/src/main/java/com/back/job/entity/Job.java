package com.back.job.entity;

import com.back.tool.model.Lane;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Entity
@Table(name = "job")
@Getter
@NoArgsConstructor
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @Setter
    @Column(nullable = false, length = 50)
    private String moduleId;

    @Setter
    @Column(length = 36)
    private String batchId;

    // 익명 소유자 식별자(쿠키 기반). 공정 스케줄링·in-flight 쿼터의 기준 (ADR-0019)
    @Setter
    @Column(length = 36)
    private String ownerToken;

    // 로그인 사용자면 기록(작업 이력, 050). 익명 Job은 null — X-Client-Id(ownerToken)와 병행 유지.
    @Setter
    @Column(name = "user_id")
    private Long userId;

    // 자원 등급 레인. 생성 시 모듈의 getLane()으로 확정 (ADR-0019)
    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Lane lane = Lane.HEAVY;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private JobStatus status;

    @Setter
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private List<String> inputPaths;

    @Setter
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, String> params;

    @Setter
    @Column
    private String resultKey;

    @Setter
    @Column(columnDefinition = "text")
    private String resultText;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // RUNNING 전환 시각. ETA 추정·진행률 계산 기준 (ADR-0019)
    @Setter
    private LocalDateTime startedAt;

    // 롱잡 진행률 0~100. 비디오는 FFmpeg 진행 파싱, 그 외는 coarse (ADR-0019)
    @Setter
    @Column(nullable = false)
    private int progress = 0;

    @Setter
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        // expiresAt은 JobService.create가 설정 TTL(storage.result-ttl)로 지정한다.
        // JobService를 거치지 않고 저장하면 nullable=false 위반으로 즉시 실패한다(fail-fast).
    }

    public void expireNow() {
        this.expiresAt = LocalDateTime.now().minusSeconds(1);
    }

    /**
     * 입력 파일들이 속한 임시 디렉토리(uploads/temp/{tempId}) 목록.
     * 처리 완료 후 즉시 삭제·만료 청소 양쪽에서 삭제 대상으로 쓴다.
     */
    public List<Path> inputTempDirs() {
        return Optional.ofNullable(inputPaths).orElse(List.of()).stream()
                .map(Path::of)
                .map(Path::getParent)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }
}
