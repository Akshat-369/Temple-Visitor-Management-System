package com.temple.backend.service;

import com.temple.backend.dto.MealPlanDTO;
import com.temple.backend.dto.VisitRequestDTO;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WhatsAppMessageBuilderService {

    /**
     * Build the full WhatsApp message for a visit request.
     */
    public String buildMessage(VisitRequestDTO visit) {
        StringBuilder sb = new StringBuilder();

        // Header
        sb.append("*🛕 Temple Visit Details*\n\n");

        // Visit info
        sb.append("📍 Mandal: ").append(nullSafe(visit.getMandalName())).append("\n");
        sb.append("👤 Representative: ").append(nullSafe(visit.getRepresentativeName())).append("\n");
        sb.append("📞 Phone: ").append(nullSafe(visit.getRepresentativePhone())).append("\n");
        sb.append("👥 Visitors: ").append(visit.getTotalVisitors()).append("\n");
        sb.append("📅 Dates: ").append(nullSafe(visit.getFromDate())).append(" to ").append(nullSafe(visit.getToDate())).append("\n");
        sb.append("⏰ Arrival: ").append(convertTo12Hour(visit.getArrivalTime())).append("\n");

        // Additional info
        if (visit.getNumberOfKids() > 0) {
            sb.append("👶 Kids: ").append(visit.getNumberOfKids()).append("\n");
        }
        if (visit.getNumberOfElderly() > 0) {
            sb.append("🧓 Elderly: ").append(visit.getNumberOfElderly()).append("\n");
        }
        if (visit.getSpecialRequirements() != null && !visit.getSpecialRequirements().isEmpty()) {
            sb.append("📝 Special: ").append(visit.getSpecialRequirements()).append("\n");
        }

        // Meal table
        List<MealPlanDTO> meals = visit.getMealPlans();
        if (meals != null && !meals.isEmpty()) {
            sb.append("\n*🍽️ Meals Summary (Date-wise)*\n\n");
            sb.append("```\n");
            sb.append(padRight("Date", 12))
              .append(padRight("Breakfast", 11))
              .append(padRight("Lunch", 9))
              .append("Dinner\n");
            sb.append("─".repeat(42)).append("\n");

            for (MealPlanDTO meal : meals) {
                String dateShort = formatDateShort(meal.getDate());
                String breakfast = meal.isBreakfastRequired() ? String.valueOf(meal.getBreakfastCount()) : "—";
                String lunch = meal.isLunchRequired() ? String.valueOf(meal.getLunchCount()) : "—";
                String dinner = meal.isDinnerRequired() ? String.valueOf(meal.getDinnerCount()) : "—";

                sb.append(padRight(dateShort, 12))
                  .append(padRight(breakfast, 11))
                  .append(padRight(lunch, 9))
                  .append(dinner).append("\n");
            }
            sb.append("```\n");
        }

        // Footer
        sb.append("\n✅ Status: *").append(nullSafe(visit.getStatus())).append("*\n");
        sb.append("🆔 Visit ID: ").append(nullSafe(visit.getVisitId()));

        return sb.toString();
    }

    /**
     * Convert 24-hour time to 12-hour AM/PM format.
     * Example: "14:30" → "02:30 PM", "09:15" → "09:15 AM"
     */
    public String convertTo12Hour(String time24) {
        if (time24 == null || time24.isEmpty()) {
            return "N/A";
        }
        try {
            String[] parts = time24.split(":");
            int hour = Integer.parseInt(parts[0]);
            String minutes = parts[1];
            String period = hour >= 12 ? "PM" : "AM";
            hour = hour % 12;
            if (hour == 0) hour = 12;
            return String.format("%02d:%s %s", hour, minutes, period);
        } catch (Exception e) {
            return time24;
        }
    }

    /**
     * Format date from "2026-04-01" to "01 Apr" (short format for table)
     */
    private String formatDateShort(String date) {
        if (date == null || date.isEmpty()) return "—";
        try {
            String[] parts = date.split("-");
            int month = Integer.parseInt(parts[1]);
            String day = parts[2];
            String[] months = {"", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
            return day + " " + months[month];
        } catch (Exception e) {
            return date;
        }
    }

    private String padRight(String text, int length) {
        if (text.length() >= length) return text;
        return text + " ".repeat(length - text.length());
    }

    private String nullSafe(String value) {
        return value != null ? value : "N/A";
    }
}
