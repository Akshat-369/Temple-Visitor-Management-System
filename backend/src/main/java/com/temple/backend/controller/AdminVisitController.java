package com.temple.backend.controller;

import com.temple.backend.dto.VisitRequestDTO;
import com.temple.backend.service.VisitService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminVisitController {

    private final VisitService visitService;

    public AdminVisitController(VisitService visitService) {
        this.visitService = visitService;
    }

    @GetMapping("/visits")
    public ResponseEntity<List<VisitRequestDTO>> getAllVisits() throws IOException {
        return ResponseEntity.ok(visitService.getAllVisits());
    }

    @GetMapping("/visits/{visitId}")
    public ResponseEntity<VisitRequestDTO> getVisit(@PathVariable String visitId) throws IOException {
        return ResponseEntity.ok(visitService.getVisitById(visitId));
    }

    @PutMapping("/visits/{visitId}")
    public ResponseEntity<Map<String, Object>> updateVisit(
            @PathVariable String visitId,
            @Valid @RequestBody VisitRequestDTO visit) throws IOException {
        visitService.updateVisit(visitId, visit);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Visit updated successfully"
        ));
    }

    @PostMapping("/visits/{visitId}/approve")
    public ResponseEntity<Map<String, Object>> approveVisit(@PathVariable String visitId) throws IOException {
        visitService.updateVisitStatus(visitId, "APPROVED");
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Visit approved successfully"
        ));
    }

    @PostMapping("/visits/{visitId}/reject")
    public ResponseEntity<Map<String, Object>> rejectVisit(@PathVariable String visitId) throws IOException {
        visitService.updateVisitStatus(visitId, "REJECTED");
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Visit rejected successfully"
        ));
    }

    @DeleteMapping("/visits/{visitId}")
    public ResponseEntity<Map<String, Object>> deleteVisit(@PathVariable String visitId) throws IOException {
        visitService.deleteVisit(visitId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Visit deleted successfully"
        ));
    }

    // ==================== MANDALS ====================

    @GetMapping("/mandals")
    public ResponseEntity<List<String>> getMandals() throws IOException {
        return ResponseEntity.ok(visitService.getAllMandals());
    }

    @PostMapping("/mandals")
    public ResponseEntity<Map<String, Object>> addMandal(@RequestBody Map<String, String> body) throws IOException {
        String mandal = body.get("name");
        if (mandal == null || mandal.isBlank()) {
            throw new IllegalArgumentException("Mandal name is required");
        }
        visitService.addMandal(mandal);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Mandal added successfully"
        ));
    }

    @DeleteMapping("/mandals/{mandal}")
    public ResponseEntity<Map<String, Object>> deleteMandal(@PathVariable String mandal) throws IOException {
        visitService.deleteMandal(mandal);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Mandal deleted successfully"
        ));
    }

    // ==================== NOTIFICATIONS ====================

    @GetMapping("/notifications")
    public ResponseEntity<List<Map<String, String>>> getNotifications() throws IOException {
        return ResponseEntity.ok(visitService.getNotifications());
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(@PathVariable String id) throws IOException {
        visitService.markNotificationRead(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification marked as read"
        ));
    }
}
