package com.temple.backend.service;

import com.temple.backend.dto.MealPlanDTO;
import com.temple.backend.dto.VisitRequestDTO;
import com.temple.backend.repository.GoogleSheetsRepository;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class VisitService {

    private final GoogleSheetsRepository repository;

    public VisitService(GoogleSheetsRepository repository) {
        this.repository = repository;
    }

    public List<VisitRequestDTO> getAllVisits() throws IOException {
        return repository.getAllVisits();
    }

    public VisitRequestDTO getVisitById(String visitId) throws IOException {
        VisitRequestDTO visit = repository.getVisitById(visitId);
        if (visit == null) {
            throw new IllegalArgumentException("Visit not found with ID: " + visitId);
        }
        return visit;
    }

    public List<VisitRequestDTO> getVisitsByPhone(String phone) throws IOException {
        List<VisitRequestDTO> allVisits = repository.getAllVisits();
        return allVisits.stream()
                .filter(v -> v.getRepresentativePhone().equals(phone))
                .collect(Collectors.toList());
    }

    public String createVisit(VisitRequestDTO visit) throws IOException {
        // Validate dates
        validateDates(visit.getFromDate(), visit.getToDate());

        // Validate meal counts
        validateMealCounts(visit.getMealPlans(), visit.getTotalVisitors());

        // Check for duplicate: same phone + overlapping dates
        checkDuplicate(visit);

        // Create
        return repository.createVisit(visit);
    }

    public boolean updateVisit(String visitId, VisitRequestDTO visit) throws IOException {
        VisitRequestDTO existing = repository.getVisitById(visitId);
        if (existing == null) {
            throw new IllegalArgumentException("Visit not found with ID: " + visitId);
        }

        validateDates(visit.getFromDate(), visit.getToDate());
        validateMealCounts(visit.getMealPlans(), visit.getTotalVisitors());

        visit.setStatus(existing.getStatus());
        visit.setTimestamp(existing.getTimestamp());

        return repository.updateVisit(visitId, visit);
    }

    public boolean updateVisitStatus(String visitId, String status) throws IOException {
        VisitRequestDTO visit = repository.getVisitById(visitId);
        if (visit == null) {
            throw new IllegalArgumentException("Visit not found with ID: " + visitId);
        }

        boolean result = repository.updateVisitStatus(visitId, status);

        // Add notification
        if (result) {
            String message;
            if ("APPROVED".equals(status)) {
                message = "Visit request from " + visit.getMandalName() + " (" + visit.getRepresentativeName() + ") has been approved.";
                repository.addNotification("APPROVED", message, visitId);
            } else if ("REJECTED".equals(status)) {
                message = "Visit request from " + visit.getMandalName() + " (" + visit.getRepresentativeName() + ") has been rejected.";
                repository.addNotification("REJECTED", message, visitId);
            }
        }

        return result;
    }

    public boolean cancelVisit(String visitId, String phone) throws IOException {
        VisitRequestDTO visit = repository.getVisitById(visitId);
        if (visit == null) {
            throw new IllegalArgumentException("Visit not found with ID: " + visitId);
        }
        if (!visit.getRepresentativePhone().equals(phone)) {
            throw new IllegalArgumentException("Phone number does not match the visit record");
        }
        return repository.updateVisitStatus(visitId, "CANCELLED");
    }

    public boolean deleteVisit(String visitId) throws IOException {
        return repository.deleteVisit(visitId);
    }

    // ==================== MANDALS ====================

    public List<String> getAllMandals() throws IOException {
        return repository.getAllMandals();
    }

    public void addMandal(String mandal) throws IOException {
        repository.addMandal(mandal);
    }

    public boolean deleteMandal(String mandal) throws IOException {
        return repository.deleteMandal(mandal);
    }

    // ==================== NOTIFICATIONS ====================

    public List<java.util.Map<String, String>> getNotifications() throws IOException {
        return repository.getNotifications();
    }

    public void markNotificationRead(String notifId) throws IOException {
        repository.markNotificationRead(notifId);
    }

    // ==================== VALIDATION ====================

    private void validateDates(String from, String to) {
        try {
            LocalDate fromDate = LocalDate.parse(from);
            LocalDate toDate = LocalDate.parse(to);
            if (fromDate.isAfter(toDate)) {
                throw new IllegalArgumentException("From date must be before or equal to To date");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid date format. Use yyyy-MM-dd");
        }
    }

    private void validateMealCounts(List<MealPlanDTO> meals, int totalVisitors) {
        if (meals == null) return;
        for (MealPlanDTO meal : meals) {
            if (meal.isBreakfastRequired() && meal.getBreakfastCount() > totalVisitors) {
                throw new IllegalArgumentException("Breakfast count for " + meal.getDate() + " exceeds total visitors");
            }
            if (meal.isLunchRequired() && meal.getLunchCount() > totalVisitors) {
                throw new IllegalArgumentException("Lunch count for " + meal.getDate() + " exceeds total visitors");
            }
            if (meal.isDinnerRequired() && meal.getDinnerCount() > totalVisitors) {
                throw new IllegalArgumentException("Dinner count for " + meal.getDate() + " exceeds total visitors");
            }
        }
    }

    private void checkDuplicate(VisitRequestDTO visit) throws IOException {
        List<VisitRequestDTO> existing = repository.getAllVisits();
        for (VisitRequestDTO v : existing) {
            if (v.getRepresentativePhone().equals(visit.getRepresentativePhone())
                    && v.getFromDate().equals(visit.getFromDate())
                    && v.getToDate().equals(visit.getToDate())
                    && !"CANCELLED".equals(v.getStatus())
                    && !"REJECTED".equals(v.getStatus())) {
                throw new IllegalArgumentException("A visit request with the same phone and dates already exists (ID: " + v.getVisitId() + ")");
            }
        }
    }
}
