package com.temple.backend.service;

import com.temple.backend.dto.DailySummaryDTO;
import com.temple.backend.dto.MealPlanDTO;
import com.temple.backend.dto.VisitRequestDTO;
import com.temple.backend.repository.GoogleSheetsRepository;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final GoogleSheetsRepository repository;

    public AnalyticsService(GoogleSheetsRepository repository) {
        this.repository = repository;
    }

    public List<DailySummaryDTO> getDailySummary(String fromDate, String toDate) throws IOException {
        List<VisitRequestDTO> allVisits = repository.getAllVisits();

        // Only include approved/pending visits
        List<VisitRequestDTO> activeVisits = allVisits.stream()
                .filter(v -> !"CANCELLED".equals(v.getStatus()) && !"REJECTED".equals(v.getStatus()))
                .collect(Collectors.toList());

        // Build a map of date -> aggregated counts
        Map<String, DailySummaryDTO> summaryMap = new TreeMap<>();

        for (VisitRequestDTO visit : activeVisits) {
            if (visit.getMealPlans() == null) continue;
            for (MealPlanDTO meal : visit.getMealPlans()) {
                String date = meal.getDate();

                // Filter by date range if specified
                if (fromDate != null && !fromDate.isEmpty() && toDate != null && !toDate.isEmpty()) {
                    try {
                        LocalDate d = LocalDate.parse(date);
                        LocalDate from = LocalDate.parse(fromDate);
                        LocalDate to = LocalDate.parse(toDate);
                        if (d.isBefore(from) || d.isAfter(to)) continue;
                    } catch (Exception e) {
                        continue;
                    }
                }

                DailySummaryDTO summary = summaryMap.getOrDefault(date,
                        new DailySummaryDTO(date, 0, 0, 0, 0));

                summary.setTotalVisitors(summary.getTotalVisitors() + visit.getTotalVisitors());
                if (meal.isBreakfastRequired()) {
                    summary.setBreakfastCount(summary.getBreakfastCount() + meal.getBreakfastCount());
                }
                if (meal.isLunchRequired()) {
                    summary.setLunchCount(summary.getLunchCount() + meal.getLunchCount());
                }
                if (meal.isDinnerRequired()) {
                    summary.setDinnerCount(summary.getDinnerCount() + meal.getDinnerCount());
                }

                summaryMap.put(date, summary);
            }
        }

        return new ArrayList<>(summaryMap.values());
    }

    public Map<String, Object> getOverallStats() throws IOException {
        List<VisitRequestDTO> allVisits = repository.getAllVisits();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRequests", allVisits.size());
        stats.put("pendingRequests", allVisits.stream().filter(v -> "PENDING".equals(v.getStatus())).count());
        stats.put("approvedRequests", allVisits.stream().filter(v -> "APPROVED".equals(v.getStatus())).count());
        stats.put("rejectedRequests", allVisits.stream().filter(v -> "REJECTED".equals(v.getStatus())).count());
        stats.put("cancelledRequests", allVisits.stream().filter(v -> "CANCELLED".equals(v.getStatus())).count());

        int totalVisitors = allVisits.stream()
                .filter(v -> !"CANCELLED".equals(v.getStatus()) && !"REJECTED".equals(v.getStatus()))
                .mapToInt(VisitRequestDTO::getTotalVisitors)
                .sum();
        stats.put("totalVisitors", totalVisitors);

        int totalBreakfast = 0, totalLunch = 0, totalDinner = 0;
        for (VisitRequestDTO visit : allVisits) {
            if (visit.getMealPlans() == null || "CANCELLED".equals(visit.getStatus()) || "REJECTED".equals(visit.getStatus()))
                continue;
            for (MealPlanDTO meal : visit.getMealPlans()) {
                if (meal.isBreakfastRequired()) totalBreakfast += meal.getBreakfastCount();
                if (meal.isLunchRequired()) totalLunch += meal.getLunchCount();
                if (meal.isDinnerRequired()) totalDinner += meal.getDinnerCount();
            }
        }
        stats.put("totalBreakfast", totalBreakfast);
        stats.put("totalLunch", totalLunch);
        stats.put("totalDinner", totalDinner);

        return stats;
    }

    public String exportCSV() throws IOException {
        List<VisitRequestDTO> allVisits = repository.getAllVisits();
        StringBuilder csv = new StringBuilder();
        csv.append("VisitID,Mandal,Representative,Phone,Visitors,From,To,Status,Timestamp\n");

        for (VisitRequestDTO visit : allVisits) {
            csv.append(String.format("%s,%s,%s,%s,%d,%s,%s,%s,%s\n",
                    visit.getVisitId(),
                    escapeCsv(visit.getMandalName()),
                    escapeCsv(visit.getRepresentativeName()),
                    visit.getRepresentativePhone(),
                    visit.getTotalVisitors(),
                    visit.getFromDate(),
                    visit.getToDate(),
                    visit.getStatus(),
                    visit.getTimestamp()));
        }

        return csv.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
