package com.temple.backend.service;

import com.temple.backend.dto.AnalyticsWhatsAppRequestDTO;
import com.temple.backend.dto.DailySummaryDTO;
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
public class AnalyticsWhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsWhatsAppService.class);

    private final AnalyticsService analyticsService;
    private final RestTemplate restTemplate;

    @Value("${whatsapp.api.token:}")
    private String apiToken;

    @Value("${whatsapp.api.phone-number-id:}")
    private String phoneNumberId;

    @Value("${whatsapp.api.enabled:false}")
    private boolean apiEnabled;

    public AnalyticsWhatsAppService(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Send full date-wise summary via WhatsApp.
     */
    public Map<String, Object> sendFullSummary(AnalyticsWhatsAppRequestDTO request) throws IOException {
        if (request.getPhoneNumber() == null || request.getPhoneNumber().isEmpty()) {
            throw new IllegalArgumentException("Phone number is required");
        }

        String phone = normalizePhone(request.getPhoneNumber());

        // Fetch summary (optionally filtered by date range)
        List<DailySummaryDTO> summaries = analyticsService.getDailySummary(
                request.getFromDate(), request.getToDate());

        if (summaries.isEmpty()) {
            throw new IllegalArgumentException("No approved visits found for the selected date(s)");
        }

        String message = buildFullSummaryMessage(summaries);
        return sendMessage(phone, message);
    }

    /**
     * Send single-date summary via WhatsApp.
     */
    public Map<String, Object> sendSingleDateSummary(AnalyticsWhatsAppRequestDTO request) throws IOException {
        if (request.getPhoneNumber() == null || request.getPhoneNumber().isEmpty()) {
            throw new IllegalArgumentException("Phone number is required");
        }
        if (request.getDate() == null || request.getDate().isEmpty()) {
            throw new IllegalArgumentException("Date is required");
        }

        String phone = normalizePhone(request.getPhoneNumber());

        // Fetch summary filtered to single date
        List<DailySummaryDTO> summaries = analyticsService.getDailySummary(
                request.getDate(), request.getDate());

        if (summaries.isEmpty()) {
            throw new IllegalArgumentException("No approved visits found for " + request.getDate());
        }

        DailySummaryDTO daySummary = summaries.get(0);
        String message = buildSingleDateMessage(daySummary);
        return sendMessage(phone, message);
    }

    /**
     * Build full summary message with date-wise table and grand totals.
     */
    private String buildFullSummaryMessage(List<DailySummaryDTO> summaries) {
        StringBuilder sb = new StringBuilder();

        sb.append("*🛕 Temple Visit Summary (All Dates)*\n\n");
        sb.append("```\n");
        sb.append(padRight("Date", 12))
          .append(padRight("Visitors", 10))
          .append(padRight("Brkfst", 9))
          .append(padRight("Lunch", 8))
          .append("Dinner\n");
        sb.append("─".repeat(47)).append("\n");

        int grandVisitors = 0, grandBreakfast = 0, grandLunch = 0, grandDinner = 0;

        for (DailySummaryDTO day : summaries) {
            String dateShort = formatDateShort(day.getDate());
            sb.append(padRight(dateShort, 12))
              .append(padRight(String.valueOf(day.getTotalVisitors()), 10))
              .append(padRight(day.getBreakfastCount() > 0 ? String.valueOf(day.getBreakfastCount()) : "—", 9))
              .append(padRight(day.getLunchCount() > 0 ? String.valueOf(day.getLunchCount()) : "—", 8))
              .append(day.getDinnerCount() > 0 ? String.valueOf(day.getDinnerCount()) : "—")
              .append("\n");

            grandVisitors += day.getTotalVisitors();
            grandBreakfast += day.getBreakfastCount();
            grandLunch += day.getLunchCount();
            grandDinner += day.getDinnerCount();
        }
        sb.append("```\n\n");

        sb.append("*📊 Grand Totals*\n");
        sb.append("👥 Visitors: ").append(grandVisitors).append("\n");
        sb.append("🥐 Breakfast: ").append(grandBreakfast).append("\n");
        sb.append("🍛 Lunch: ").append(grandLunch).append("\n");
        sb.append("🍽️ Dinner: ").append(grandDinner).append("\n");

        return sb.toString();
    }

    /**
     * Build single-date summary message.
     */
    private String buildSingleDateMessage(DailySummaryDTO day) {
        StringBuilder sb = new StringBuilder();

        sb.append("*🛕 Temple Visit Summary*\n\n");
        sb.append("📅 Date: ").append(day.getDate()).append("\n\n");
        sb.append("👥 Visitors: ").append(day.getTotalVisitors()).append("\n");
        sb.append("🥐 Breakfast: ").append(day.getBreakfastCount() > 0 ? day.getBreakfastCount() : "—").append("\n");
        sb.append("🍛 Lunch: ").append(day.getLunchCount() > 0 ? day.getLunchCount() : "—").append("\n");
        sb.append("🍽️ Dinner: ").append(day.getDinnerCount() > 0 ? day.getDinnerCount() : "—").append("\n");

        return sb.toString();
    }

    /**
     * Send via WhatsApp Cloud API or fallback to wa.me link.
     */
    private Map<String, Object> sendMessage(String phone, String message) {
        Map<String, Object> result = new HashMap<>();

        if (apiEnabled && apiToken != null && !apiToken.isEmpty()) {
            boolean sent = sendViaCloudAPI(phone, message);
            if (sent) {
                result.put("success", true);
                result.put("message", "Summary sent successfully via WhatsApp");
                result.put("formattedMessage", message);
            } else {
                result.put("success", false);
                result.put("message", "Failed to send WhatsApp message. Please try again.");
                result.put("formattedMessage", message);
            }
        } else {
            try {
                String waLink = "https://wa.me/" + phone + "?text=" +
                        java.net.URLEncoder.encode(message, "UTF-8");
                result.put("success", true);
                result.put("message", "WhatsApp API not configured. Opening WhatsApp Web...");
                result.put("formattedMessage", message);
                result.put("waLink", waLink);
                result.put("fallback", true);
            } catch (Exception e) {
                result.put("success", false);
                result.put("message", "Failed to generate WhatsApp link");
            }
        }
        return result;
    }

    private boolean sendViaCloudAPI(String phone, String message) {
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
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("WhatsApp send failed: {}", e.getMessage());
            return false;
        }
    }

    private String formatDateShort(String date) {
        if (date == null) return "—";
        try {
            String[] parts = date.split("-");
            int month = Integer.parseInt(parts[1]);
            String day = parts[2];
            String[] months = {"", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
            return day + " " + months[month];
        } catch (Exception e) { return date; }
    }

    private String padRight(String text, int length) {
        if (text.length() >= length) return text;
        return text + " ".repeat(length - text.length());
    }

    private String normalizePhone(String phone) {
        phone = phone.replaceAll("[^0-9+]", "");
        if (phone.startsWith("+")) return phone.substring(1);
        if (phone.startsWith("91") && phone.length() == 12) return phone;
        if (phone.length() == 10) return "91" + phone;
        return phone;
    }
}
