package com.back.personalization.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_favorite", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "module_id"}))
@Getter
@NoArgsConstructor
public class UserFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "module_id", nullable = false, length = 50)
    private String moduleId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public UserFavorite(Long userId, String moduleId) {
        this.userId = userId;
        this.moduleId = moduleId;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
