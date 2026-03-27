package com.temple.backend.service;

import com.temple.backend.dto.VisitRequestDTO;
import com.temple.backend.dto.WhatsAppRequestDTO;
import com.temple.backend.repository.GoogleSheetsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);

    private final GoogleSheetsRepository repository;
    private final WhatsAppMessageBuilderService messageBuilder;
    private final RestTemplate restTemplate;

    @Value("${whatsapp.api.token:}")
    private String apiToken;

    @Value("${whatsapp.api.phone-number-id:}")
    private String phoneNumberId;

    @Value("${whatsapp.api.enabled:false}")
    private boolean apiEnabled;

    public WhatsAppService(GoogleSheetsRepository repository,
                           WhatsAppMessageBuilderService messageBuilder) {
        this.repository = repository;
        this.messageBuilder = messageBuilder;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Send WhatsApp message for an approved visit.
     *
     * @return Map with success status and message
     */
    public Map<String, Object> sendMessage(WhatsAppRequestDTO request) throws IOException {
        Map<String, Object> result = new HashMap<>();

        // 1. Validate input
        if (request.getVisitId() == null || request.getVisitId().isEmpty()) {
            throw new IllegalArgumentException("Visit ID is required");
        }
        if (request.getPhoneNumber() == null || request.getPhoneNumber().isEmpty()) {
            throw new IllegalArgumentException("Phone number is required");
        }

        // Normalize phone number: ensure it starts with country code
        String phone = normalizePhone(request.getPhoneNumber());

        // 2. Fetch visit data
        VisitRequestDTO visit = repository.getVisitById(request.getVisitId());
        if (visit == null) {
            throw new IllegalArgumentException("Visit not found with ID: " + request.getVisitId());
        }

        // 3. Check status == APPROVED (strict backend validation)
        if (!"APPROVED".equals(visit.getStatus())) {
            throw new IllegalArgumentException("Only approved visits can be shared via WhatsApp. Current status: " + visit.getStatus());
        }

        // 4. Build formatted message
        String message = messageBuilder.buildMessage(visit);

        // 5. Send via WhatsApp API
        if (apiEnabled && apiToken != null && !apiToken.isEmpty()) {
            boolean sent = sendViaWhatsAppCloudAPI(phone, message);
            if (sent) {
                result.put("success", true);
                result.put("message", "WhatsApp message sent successfully to " + phone);
                result.put("formattedMessage", message);
            } else {
                result.put("success", false);
                result.put("message", "Failed to send WhatsApp message. Please try again.");
                result.put("formattedMessage", message);
            }
        } else {
            // Fallback: return the formatted message for manual sharing via wa.me link
            String waLink = "https://wa.me/" + phone + "?text=" + java.net.URLEncoder.encode(message, "UTF-8");
            result.put("success", true);
            result.put("message", "WhatsApp API not configured. Use the link to send manually.");
            result.put("formattedMessage", message);
            result.put("waLink", waLink);
            result.put("fallback", true);
        }

        return result;
    }

    /**
     * Send message using Meta WhatsApp Cloud API
     */
    private boolean sendViaWhatsAppCloudAPI(String phone, String message) {
        try {
            String url = "https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiToken);

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("to", phone);
            body.put("type", "text");

            Map<String, Object> text = new HashMap<>();
            text.put("preview_url", false);
            text.put("body", message);
            body.put("text", text);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            log.info("WhatsApp API response: {} - {}", response.getStatusCode(), response.getBody());
            return response.getStatusCode().is2xxSuccessful();

        } catch (Exception e) {
            log.error("Failed to send WhatsApp message: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Normalize phone number - ensure it has country code (default: India +91)
     */
    private String normalizePhone(String phone) {
        // Remove spaces, dashes, etc.
        phone = phone.replaceAll("[^0-9+]", "");

        // If starts with +, keep as is
        if (phone.startsWith("+")) {
            return phone.substring(1); // Remove + for API compatibility
        }

        // If starts with 91 and is 12 digits, it already has country code
        if (phone.startsWith("91") && phone.length() == 12) {
            return phone;
        }

        // If 10 digits, prepend 91 (India)
        if (phone.length() == 10) {
            return "91" + phone;
        }

        return phone;
    }
}
