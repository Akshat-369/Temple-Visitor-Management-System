package com.temple.backend.repository;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.*;
import com.temple.backend.dto.VisitRequestDTO;
import com.temple.backend.dto.MealPlanDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Repository
public class GoogleSheetsRepository {

    private static final Logger log = LoggerFactory.getLogger(GoogleSheetsRepository.class);

    private final Sheets sheetsService;
    private final ObjectMapper objectMapper;

    @Value("${google.sheets.spreadsheet-id}")
    private String spreadsheetId;

    // Configurable sheet/tab names (from application.properties / env vars)
    @Value("${google.sheets.tab.visits:Temple Data}")
    private String visitsSheet;

    @Value("${google.sheets.tab.mandals:Mandals}")
    private String mandalsSheet;

    @Value("${google.sheets.tab.notifications:Notifications}")
    private String notificationsSheet;

    // Column indices for Visits sheet
    private static final int COL_VISIT_ID = 0;
    private static final int COL_MANDAL = 1;
    private static final int COL_REP_NAME = 2;
    private static final int COL_REP_PHONE = 3;
    private static final int COL_NUM_REP = 4;
    private static final int COL_FROM_DATE = 5;
    private static final int COL_TO_DATE = 6;
    private static final int COL_ARRIVAL = 7;
    private static final int COL_TOTAL_VISITORS = 8;
    private static final int COL_MEALS_JSON = 9;
    private static final int COL_KIDS = 10;
    private static final int COL_ELDERLY = 11;
    private static final int COL_SPECIAL_REQ = 12;
    private static final int COL_NOTES = 13;
    private static final int COL_STATUS = 14;
    private static final int COL_TIMESTAMP = 15;

    public GoogleSheetsRepository(Sheets sheetsService) {
        this.sheetsService = sheetsService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Properly quote a sheet name for use in A1 range notation.
     * Google Sheets requires single quotes around sheet names that contain spaces.
     * Example: "Temple data" → "'Temple data'"
     */
    private String sheetRef(String sheetName) {
        String trimmed = sheetName.trim();
        if (trimmed.contains(" ") || trimmed.contains("'")) {
            // Escape any single quotes within the name by doubling them
            return "'" + trimmed.replace("'", "''") + "'";
        }
        return trimmed;
    }

    // ==================== VISITS ====================

    public List<VisitRequestDTO> getAllVisits() throws IOException {
        String range = sheetRef(visitsSheet) + "!A2:P";
        log.debug("[READ] Fetching all visits from sheet: '{}', range: {}", visitsSheet, range);

        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, range)
                .execute();

        List<List<Object>> values = response.getValues();
        if (values == null || values.isEmpty()) {
            log.debug("[READ] No visits found in sheet '{}'", visitsSheet);
            return new ArrayList<>();
        }

        log.debug("[READ] Found {} visit rows in sheet '{}'", values.size(), visitsSheet);
        return values.stream()
                .map(this::rowToVisitDTO)
                .collect(Collectors.toList());
    }

    public VisitRequestDTO getVisitById(String visitId) throws IOException {
        List<VisitRequestDTO> visits = getAllVisits();
        return visits.stream()
                .filter(v -> v.getVisitId().equals(visitId))
                .findFirst()
                .orElse(null);
    }

    public VisitRequestDTO getVisitByPhone(String phone) throws IOException {
        List<VisitRequestDTO> visits = getAllVisits();
        return visits.stream()
                .filter(v -> v.getRepresentativePhone().equals(phone))
                .findFirst()
                .orElse(null);
    }

    public String createVisit(VisitRequestDTO visit) throws IOException {
        String visitId = "VIS-" + System.currentTimeMillis();
        visit.setVisitId(visitId);
        visit.setStatus("PENDING");
        visit.setTimestamp(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        List<Object> row = visitDTOToRow(visit);
        String range = sheetRef(visitsSheet) + "!A:P";
        log.info("[WRITE] Creating visit {} for {} ({}) → sheet: '{}', range: {}", visitId, visit.getMandalName(), visit.getRepresentativeName(), visitsSheet, range);

        ValueRange body = new ValueRange().setValues(Collections.singletonList(row));
        try {
            var result = sheetsService.spreadsheets().values()
                    .append(spreadsheetId, range, body)
                    .setValueInputOption("RAW")
                    .execute();
            log.info("[WRITE] ✅ Visit {} written to sheet '{}'. Updated range: {}", visitId, visitsSheet, result.getUpdates().getUpdatedRange());
        } catch (IOException e) {
            log.error("[WRITE] ❌ FAILED to write visit {} to sheet '{}': {}", visitId, visitsSheet, e.getMessage(), e);
            throw e;
        }

        return visitId;
    }

    public boolean updateVisit(String visitId, VisitRequestDTO visit) throws IOException {
        log.info("[UPDATE] Updating visit {} in sheet '{}'", visitId, visitsSheet);
        int rowIndex = findVisitRowIndex(visitId);
        if (rowIndex == -1) {
            log.warn("[UPDATE] Visit {} not found in sheet '{}'", visitId, visitsSheet);
            return false;
        }

        visit.setVisitId(visitId);
        List<Object> row = visitDTOToRow(visit);

        String range = sheetRef(visitsSheet) + "!A" + (rowIndex + 2) + ":P" + (rowIndex + 2);
        ValueRange body = new ValueRange().setValues(Collections.singletonList(row));

        try {
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, range, body)
                    .setValueInputOption("RAW")
                    .execute();
            log.info("[UPDATE] ✅ Visit {} updated at sheet: '{}', range: {}", visitId, visitsSheet, range);
        } catch (IOException e) {
            log.error("[UPDATE] ❌ FAILED to update visit {} in sheet '{}': {}", visitId, visitsSheet, e.getMessage(), e);
            throw e;
        }

        return true;
    }

    public boolean updateVisitStatus(String visitId, String status) throws IOException {
        log.info("[STATUS] Updating visit {} status to {} in sheet '{}'", visitId, status, visitsSheet);
        int rowIndex = findVisitRowIndex(visitId);
        if (rowIndex == -1) {
            log.warn("[STATUS] Visit {} not found in sheet '{}'", visitId, visitsSheet);
            return false;
        }

        String range = sheetRef(visitsSheet) + "!O" + (rowIndex + 2);
        ValueRange body = new ValueRange().setValues(
                Collections.singletonList(Collections.singletonList(status)));

        try {
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, range, body)
                    .setValueInputOption("RAW")
                    .execute();
            log.info("[STATUS] ✅ Visit {} status updated to {} at sheet: '{}', range: {}", visitId, status, visitsSheet, range);
        } catch (IOException e) {
            log.error("[STATUS] ❌ FAILED to update status for {} in sheet '{}': {}", visitId, visitsSheet, e.getMessage(), e);
            throw e;
        }

        return true;
    }

    public boolean deleteVisit(String visitId) throws IOException {
        log.info("[DELETE] Deleting visit {} from sheet '{}'", visitId, visitsSheet);
        int rowIndex = findVisitRowIndex(visitId);
        if (rowIndex == -1) {
            log.warn("[DELETE] Visit {} not found in sheet '{}'", visitId, visitsSheet);
            return false;
        }

        Spreadsheet spreadsheet = sheetsService.spreadsheets()
                .get(spreadsheetId)
                .execute();

        Integer sheetId = spreadsheet.getSheets().stream()
                .filter(s -> s.getProperties().getTitle().equals(visitsSheet.trim()))
                .findFirst()
                .map(s -> s.getProperties().getSheetId())
                .orElse(null);

        if (sheetId == null) {
            log.error("[DELETE] Sheet '{}' not found in spreadsheet!", visitsSheet);
            return false;
        }

        DeleteDimensionRequest deleteRequest = new DeleteDimensionRequest()
                .setRange(new DimensionRange()
                        .setSheetId(sheetId)
                        .setDimension("ROWS")
                        .setStartIndex(rowIndex + 1) // +1 for header
                        .setEndIndex(rowIndex + 2));

        BatchUpdateSpreadsheetRequest batchRequest = new BatchUpdateSpreadsheetRequest()
                .setRequests(Collections.singletonList(
                        new Request().setDeleteDimension(deleteRequest)));

        sheetsService.spreadsheets()
                .batchUpdate(spreadsheetId, batchRequest)
                .execute();

        log.info("[DELETE] ✅ Visit {} deleted from sheet '{}'", visitId, visitsSheet);
        return true;
    }

    private int findVisitRowIndex(String visitId) throws IOException {
        String range = sheetRef(visitsSheet) + "!A2:A";
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, range)
                .execute();

        List<List<Object>> values = response.getValues();
        if (values == null) return -1;

        for (int i = 0; i < values.size(); i++) {
            if (values.get(i).size() > 0 && values.get(i).get(0).toString().equals(visitId)) {
                return i;
            }
        }
        return -1;
    }

    private List<Object> visitDTOToRow(VisitRequestDTO visit) {
        String mealsJson = "[]";
        try {
            mealsJson = objectMapper.writeValueAsString(visit.getMealPlans() != null ? visit.getMealPlans() : new ArrayList<>());
        } catch (Exception e) {
            // fallback
        }

        List<Object> row = new ArrayList<>();
        row.add(visit.getVisitId());
        row.add(visit.getMandalName());
        row.add(visit.getRepresentativeName());
        row.add(visit.getRepresentativePhone());
        row.add(String.valueOf(visit.getNumberOfRepresentatives()));
        row.add(visit.getFromDate());
        row.add(visit.getToDate());
        row.add(visit.getArrivalTime() != null ? visit.getArrivalTime() : "");
        row.add(String.valueOf(visit.getTotalVisitors()));
        row.add(mealsJson);
        row.add(String.valueOf(visit.getNumberOfKids()));
        row.add(String.valueOf(visit.getNumberOfElderly()));
        row.add(visit.getSpecialRequirements() != null ? visit.getSpecialRequirements() : "");
        row.add(visit.getNotes() != null ? visit.getNotes() : "");
        row.add(visit.getStatus() != null ? visit.getStatus() : "PENDING");
        row.add(visit.getTimestamp() != null ? visit.getTimestamp() : LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return row;
    }

    private VisitRequestDTO rowToVisitDTO(List<Object> row) {
        VisitRequestDTO dto = new VisitRequestDTO();
        dto.setVisitId(getCell(row, COL_VISIT_ID));
        dto.setMandalName(getCell(row, COL_MANDAL));
        dto.setRepresentativeName(getCell(row, COL_REP_NAME));
        dto.setRepresentativePhone(getCell(row, COL_REP_PHONE));
        dto.setNumberOfRepresentatives(parseIntSafe(getCell(row, COL_NUM_REP), 1));
        dto.setFromDate(getCell(row, COL_FROM_DATE));
        dto.setToDate(getCell(row, COL_TO_DATE));
        dto.setArrivalTime(getCell(row, COL_ARRIVAL));
        dto.setTotalVisitors(parseIntSafe(getCell(row, COL_TOTAL_VISITORS), 0));

        String mealsJson = getCell(row, COL_MEALS_JSON);
        try {
            if (mealsJson != null && !mealsJson.isEmpty()) {
                List<MealPlanDTO> meals = objectMapper.readValue(mealsJson, new TypeReference<List<MealPlanDTO>>() {});
                dto.setMealPlans(meals);
            }
        } catch (Exception e) {
            dto.setMealPlans(new ArrayList<>());
        }

        dto.setNumberOfKids(parseIntSafe(getCell(row, COL_KIDS), 0));
        dto.setNumberOfElderly(parseIntSafe(getCell(row, COL_ELDERLY), 0));
        dto.setSpecialRequirements(getCell(row, COL_SPECIAL_REQ));
        dto.setNotes(getCell(row, COL_NOTES));
        dto.setStatus(getCell(row, COL_STATUS));
        dto.setTimestamp(getCell(row, COL_TIMESTAMP));
        return dto;
    }

    private String getCell(List<Object> row, int index) {
        if (index < row.size() && row.get(index) != null) {
            return row.get(index).toString();
        }
        return "";
    }

    private int parseIntSafe(String value, int defaultVal) {
        try {
            return Integer.parseInt(value);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    // ==================== MANDALS ====================

    public List<String> getAllMandals() throws IOException {
        try {
            String range = sheetRef(mandalsSheet) + "!A2:A";
            ValueRange response = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, range)
                    .execute();

            List<List<Object>> values = response.getValues();
            if (values == null || values.isEmpty()) {
                return new ArrayList<>();
            }

            return values.stream()
                    .filter(row -> !row.isEmpty())
                    .map(row -> row.get(0).toString())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("[MANDALS] Error reading mandals from sheet '{}': {}", mandalsSheet, e.getMessage());
            return new ArrayList<>();
        }
    }

    public void addMandal(String mandal) throws IOException {
        String range = sheetRef(mandalsSheet) + "!A:A";
        log.info("[MANDALS] Adding mandal '{}' to sheet '{}', range: {}", mandal, mandalsSheet, range);
        ValueRange body = new ValueRange().setValues(
                Collections.singletonList(Collections.singletonList(mandal)));
        sheetsService.spreadsheets().values()
                .append(spreadsheetId, range, body)
                .setValueInputOption("RAW")
                .execute();
        log.info("[MANDALS] ✅ Mandal '{}' added", mandal);
    }

    public boolean deleteMandal(String mandal) throws IOException {
        try {
            String range = sheetRef(mandalsSheet) + "!A2:A";
            ValueRange response = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, range)
                    .execute();

            List<List<Object>> values = response.getValues();
            if (values == null) return false;

            int rowIndex = -1;
            for (int i = 0; i < values.size(); i++) {
                if (!values.get(i).isEmpty() && values.get(i).get(0).toString().equals(mandal)) {
                    rowIndex = i;
                    break;
                }
            }

            if (rowIndex == -1) return false;

            Spreadsheet spreadsheet = sheetsService.spreadsheets()
                    .get(spreadsheetId)
                    .execute();

            Integer sheetId = spreadsheet.getSheets().stream()
                    .filter(s -> s.getProperties().getTitle().equals(mandalsSheet.trim()))
                    .findFirst()
                    .map(s -> s.getProperties().getSheetId())
                    .orElse(null);

            if (sheetId == null) return false;

            DeleteDimensionRequest deleteRequest = new DeleteDimensionRequest()
                    .setRange(new DimensionRange()
                            .setSheetId(sheetId)
                            .setDimension("ROWS")
                            .setStartIndex(rowIndex + 1)
                            .setEndIndex(rowIndex + 2));

            BatchUpdateSpreadsheetRequest batchRequest = new BatchUpdateSpreadsheetRequest()
                    .setRequests(Collections.singletonList(
                            new Request().setDeleteDimension(deleteRequest)));

            sheetsService.spreadsheets()
                    .batchUpdate(spreadsheetId, batchRequest)
                    .execute();

            log.info("[MANDALS] ✅ Mandal '{}' deleted from sheet '{}'", mandal, mandalsSheet);
            return true;
        } catch (Exception e) {
            log.error("[MANDALS] Error deleting mandal '{}': {}", mandal, e.getMessage());
            return false;
        }
    }

    // ==================== NOTIFICATIONS ====================

    public void addNotification(String type, String message, String visitId) throws IOException {
        String id = "NOTIF-" + System.currentTimeMillis();
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        List<Object> row = Arrays.asList(id, type, message, visitId, timestamp, "false");
        String range = sheetRef(notificationsSheet) + "!A:F";
        ValueRange body = new ValueRange().setValues(Collections.singletonList(row));

        sheetsService.spreadsheets().values()
                .append(spreadsheetId, range, body)
                .setValueInputOption("RAW")
                .execute();
    }

    public List<Map<String, String>> getNotifications() throws IOException {
        try {
            String range = sheetRef(notificationsSheet) + "!A2:F";
            ValueRange response = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, range)
                    .execute();

            List<List<Object>> values = response.getValues();
            if (values == null || values.isEmpty()) {
                return new ArrayList<>();
            }

            return values.stream()
                    .map(row -> {
                        Map<String, String> notif = new HashMap<>();
                        notif.put("id", getCell(row, 0));
                        notif.put("type", getCell(row, 1));
                        notif.put("message", getCell(row, 2));
                        notif.put("visitId", getCell(row, 3));
                        notif.put("timestamp", getCell(row, 4));
                        notif.put("read", getCell(row, 5));
                        return notif;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void markNotificationRead(String notifId) throws IOException {
        try {
            String range = sheetRef(notificationsSheet) + "!A2:A";
            ValueRange response = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, range)
                    .execute();

            List<List<Object>> values = response.getValues();
            if (values == null) return;

            for (int i = 0; i < values.size(); i++) {
                if (!values.get(i).isEmpty() && values.get(i).get(0).toString().equals(notifId)) {
                    String updateRange = sheetRef(notificationsSheet) + "!F" + (i + 2);
                    ValueRange body = new ValueRange().setValues(
                            Collections.singletonList(Collections.singletonList("true")));
                    sheetsService.spreadsheets().values()
                            .update(spreadsheetId, updateRange, body)
                            .setValueInputOption("RAW")
                            .execute();
                    break;
                }
            }
        } catch (Exception e) {
            log.error("[NOTIFICATIONS] Error marking notification read: {}", e.getMessage());
        }
    }

    // ==================== SHEET INITIALIZATION ====================

    public void initializeSheets() throws IOException {
        log.info("[INIT] Initializing sheets... Visits='{}', Mandals='{}', Notifications='{}'", visitsSheet, mandalsSheet, notificationsSheet);

        Spreadsheet spreadsheet = sheetsService.spreadsheets()
                .get(spreadsheetId)
                .execute();

        Set<String> existingSheets = spreadsheet.getSheets().stream()
                .map(s -> s.getProperties().getTitle())
                .collect(Collectors.toSet());

        log.info("[INIT] Existing sheets in spreadsheet: {}", existingSheets);

        List<Request> requests = new ArrayList<>();
        String visitsName = visitsSheet.trim();
        String mandalsName = mandalsSheet.trim();
        String notificationsName = notificationsSheet.trim();

        if (!existingSheets.contains(visitsName)) {
            log.info("[INIT] Creating sheet tab: '{}'", visitsName);
            requests.add(new Request().setAddSheet(
                    new AddSheetRequest().setProperties(
                            new SheetProperties().setTitle(visitsName))));
        }
        if (!existingSheets.contains(mandalsName)) {
            log.info("[INIT] Creating sheet tab: '{}'", mandalsName);
            requests.add(new Request().setAddSheet(
                    new AddSheetRequest().setProperties(
                            new SheetProperties().setTitle(mandalsName))));
        }
        if (!existingSheets.contains(notificationsName)) {
            log.info("[INIT] Creating sheet tab: '{}'", notificationsName);
            requests.add(new Request().setAddSheet(
                    new AddSheetRequest().setProperties(
                            new SheetProperties().setTitle(notificationsName))));
        }

        if (!requests.isEmpty()) {
            BatchUpdateSpreadsheetRequest batchRequest = new BatchUpdateSpreadsheetRequest()
                    .setRequests(requests);
            sheetsService.spreadsheets()
                    .batchUpdate(spreadsheetId, batchRequest)
                    .execute();
            log.info("[INIT] Created {} new sheet tabs", requests.size());
        }

        // Add headers if Visits sheet was just created or has no headers
        try {
            String headerRange = sheetRef(visitsSheet) + "!A1:P1";
            ValueRange headerCheck = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, headerRange)
                    .execute();
            if (headerCheck.getValues() == null || headerCheck.getValues().isEmpty()) {
                addHeaders();
            }
        } catch (Exception e) {
            addHeaders();
        }

        // Add Mandals header
        try {
            String mandalHeaderRange = sheetRef(mandalsSheet) + "!A1";
            ValueRange mandalHeader = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, mandalHeaderRange)
                    .execute();
            if (mandalHeader.getValues() == null || mandalHeader.getValues().isEmpty()) {
                ValueRange body = new ValueRange().setValues(
                        Collections.singletonList(Collections.singletonList("MandalName")));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, mandalHeaderRange, body)
                        .setValueInputOption("RAW")
                        .execute();
            }
        } catch (Exception e) {
            log.warn("[INIT] Could not set Mandals header: {}", e.getMessage());
        }

        // Add Notifications header
        try {
            String notifHeaderRange = sheetRef(notificationsSheet) + "!A1:F1";
            ValueRange notifHeader = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, notifHeaderRange)
                    .execute();
            if (notifHeader.getValues() == null || notifHeader.getValues().isEmpty()) {
                ValueRange body = new ValueRange().setValues(
                        Collections.singletonList(Arrays.asList("ID", "Type", "Message", "VisitID", "Timestamp", "Read")));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, notifHeaderRange, body)
                        .setValueInputOption("RAW")
                        .execute();
            }
        } catch (Exception e) {
            log.warn("[INIT] Could not set Notifications header: {}", e.getMessage());
        }

        // Validate that the visits sheet now exists
        Spreadsheet recheck = sheetsService.spreadsheets().get(spreadsheetId).execute();
        boolean visitsExists = recheck.getSheets().stream()
                .anyMatch(s -> s.getProperties().getTitle().equals(visitsName));
        if (!visitsExists) {
            throw new IOException("FATAL: Sheet tab '" + visitsName + "' does not exist and could not be created!");
        }

        log.info("[INIT] ✅ All sheets initialized. Visits sheet '{}' verified.", visitsName);
    }

    private void addHeaders() throws IOException {
        List<Object> headers = Arrays.asList(
                "VisitID", "Mandal", "RepName", "RepPhone", "NumRep",
                "FromDate", "ToDate", "ArrivalTime", "TotalVisitors", "MealsJSON",
                "Kids", "Elderly", "SpecialReq", "Notes", "Status", "Timestamp");

        String range = sheetRef(visitsSheet) + "!A1:P1";
        log.info("[INIT] Adding headers to sheet '{}', range: {}", visitsSheet, range);
        ValueRange body = new ValueRange().setValues(Collections.singletonList(headers));
        sheetsService.spreadsheets().values()
                .update(spreadsheetId, range, body)
                .setValueInputOption("RAW")
                .execute();
    }
}
