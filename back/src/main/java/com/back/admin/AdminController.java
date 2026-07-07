package com.back.admin;

import com.back.comment.entity.Comment;
import com.back.comment.service.CommentService;
import com.back.stats.dto.ToolStatsResponse;
import com.back.stats.service.ToolStatsService;
import com.back.suggestion.entity.Suggestion;
import com.back.suggestion.service.SuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ToolStatsService toolStatsService;
    private final SuggestionService suggestionService;
    private final CommentService commentService;

    @GetMapping("/stats")
    public ResponseEntity<List<ToolStatsResponse>> getStats() {
        List<ToolStatsResponse> stats = toolStatsService.findAll().stream()
                .map(ToolStatsResponse::from)
                .toList();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<Suggestion>> getSuggestions() {
        return ResponseEntity.ok(suggestionService.findAll());
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) {
        commentService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
