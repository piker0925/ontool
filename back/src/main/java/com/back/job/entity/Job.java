package com.back.job.entity;

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
    @Column(length = 255)
    private String resultKey;

    @Setter
    @Column(columnDefinition = "text")
    private String resultText;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

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
