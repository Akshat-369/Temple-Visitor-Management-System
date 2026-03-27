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
@RequestMapping("/api/v1/public")
public class PublicVisitController {

    private final VisitService visitService;

    public PublicVisitController(VisitService visitService) {
        this.visitService = visitService;
    }

    @PostMapping("/visits")
    public ResponseEntity<Map<String, Object>> submitVisit(@Valid @RequestBody VisitRequestDTO visit) throws IOException {
        String visitId = visitService.createVisit(visit);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "visitId", visitId,
                "message", "Visit request submitted successfully. Your Visit ID: " + visitId
        ));
    }

    @GetMapping("/visits/{visitId}")
    public ResponseEntity<VisitRequestDTO> getVisit(@PathVariable String visitId) throws IOException {
        return ResponseEntity.ok(visitService.getVisitById(visitId));
    }

    @GetMapping("/visits/phone/{phone}")
    public ResponseEntity<List<VisitRequestDTO>> getVisitsByPhone(@PathVariable String phone) throws IOException {
        return ResponseEntity.ok(visitService.getVisitsByPhone(phone));
    }

    @PutMapping("/visits/{visitId}")
    public ResponseEntity<Map<String, Object>> updateVisit(
            @PathVariable String visitId,
            @Valid @RequestBody VisitRequestDTO visit) throws IOException {
        visitService.updateVisit(visitId, visit);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Visit request updated successfully"
        ));
    }

    @PostMapping("/visits/{visitId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelVisit(
            @PathVariable String visitId,
            @RequestBody Map<String, String> body) throws IOException {
        String phone = body.get("phone");
        if (phone == null || phone.isEmpty()) {
            throw new IllegalArgumentException("Phone number is required for cancellation");
        }
        visitService.cancelVisit(visitId, phone);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Visit request cancelled successfully"
        ));
    }

    @GetMapping("/mandals")
    public ResponseEntity<List<String>> getMandals() throws IOException {
        return ResponseEntity.ok(visitService.getAllMandals());
    }
}
