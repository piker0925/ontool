package com.back.personalization.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_recent_tool", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "module_id"}))
@Getter
@NoArgsConstructor
public class UserRecentTool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "module_id", nullable = false, length = 50)
    private String moduleId;

    @Setter
    @Column(name = "last_used_at", nullable = false)
    private LocalDateTime lastUsedAt;

    public UserRecentTool(Long userId, String moduleId, LocalDateTime lastUsedAt) {
        this.userId = userId;
        this.moduleId = moduleId;
        this.lastUsedAt = lastUsedAt;
    }
}
