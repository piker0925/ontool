package com.back.stats.service;

import com.back.stats.entity.ToolStats;
import com.back.stats.repository.ToolStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ToolStatsService {

    private final ToolStatsRepository toolStatsRepository;

    @Transactional(readOnly = true)
    public List<ToolStats> findAll() {
        return toolStatsRepository.findAll();
    }

    @Transactional
    public ToolStats getOrCreate(String moduleId) {
        return toolStatsRepository.findById(moduleId)
                .orElseGet(() -> toolStatsRepository.save(new ToolStats(moduleId)));
    }

    @Transactional
    public void incrementUseCount(String moduleId) {
        ToolStats stats = getOrCreate(moduleId);
        stats.setUseCount(stats.getUseCount() + 1);
        toolStatsRepository.save(stats);
    }

    @Transactional
    public void incrementLikeCount(String moduleId) {
        ToolStats stats = getOrCreate(moduleId);
        stats.setLikeCount(stats.getLikeCount() + 1);
        toolStatsRepository.save(stats);
    }
}
