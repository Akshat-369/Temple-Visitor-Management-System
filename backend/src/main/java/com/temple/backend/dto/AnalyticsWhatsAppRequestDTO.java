package com.temple.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsWhatsAppRequestDTO {
    private String phoneNumber;
    private String date;       // For single-date share (nullable for full summary)
    private String fromDate;   // Optional date range filter
    private String toDate;     // Optional date range filter
}
