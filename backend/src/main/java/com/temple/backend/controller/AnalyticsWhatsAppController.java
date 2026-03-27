package com.temple.backend.controller;

import com.temple.backend.dto.AnalyticsWhatsAppRequestDTO;
import com.temple.backend.service.AnalyticsWhatsAppService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/analytics/whatsapp")
public class AnalyticsWhatsAppController {

    private final AnalyticsWhatsAppService service;

    public AnalyticsWhatsAppController(AnalyticsWhatsAppService service) {
        this.service = service;
    }

    @PostMapping("/full")
    public ResponseEntity<Map<String, Object>> sendFullSummary(
            @RequestBody AnalyticsWhatsAppRequestDTO request) throws IOException {
        return ResponseEntity.ok(service.sendFullSummary(request));
    }

    @PostMapping("/date")
    public ResponseEntity<Map<String, Object>> sendSingleDateSummary(
            @RequestBody AnalyticsWhatsAppRequestDTO request) throws IOException {
        return ResponseEntity.ok(service.sendSingleDateSummary(request));
    }
}
