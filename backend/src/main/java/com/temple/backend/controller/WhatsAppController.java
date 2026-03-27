package com.temple.backend.controller;

import com.temple.backend.dto.WhatsAppRequestDTO;
import com.temple.backend.service.WhatsAppService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/whatsapp")
public class WhatsAppController {

    private final WhatsAppService whatsAppService;

    public WhatsAppController(WhatsAppService whatsAppService) {
        this.whatsAppService = whatsAppService;
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendWhatsApp(@RequestBody WhatsAppRequestDTO request) throws IOException {
        Map<String, Object> result = whatsAppService.sendMessage(request);
        return ResponseEntity.ok(result);
    }
}
