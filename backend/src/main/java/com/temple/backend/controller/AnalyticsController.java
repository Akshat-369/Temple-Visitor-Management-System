package com.temple.backend.controller;

import com.temple.backend.dto.DailySummaryDTO;
import com.temple.backend.service.AnalyticsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/daily")
    public ResponseEntity<List<DailySummaryDTO>> getDailySummary(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) throws IOException {
        return ResponseEntity.ok(analyticsService.getDailySummary(fromDate, toDate));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() throws IOException {
        return ResponseEntity.ok(analyticsService.getOverallStats());
    }

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCSV() throws IOException {
        String csv = analyticsService.exportCSV();
        byte[] bytes = csv.getBytes();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=visits_export.csv")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(bytes.length)
                .body(bytes);
    }
}
