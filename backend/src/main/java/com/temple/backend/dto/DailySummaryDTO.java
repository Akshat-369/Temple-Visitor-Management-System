package com.temple.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailySummaryDTO {
    private String date;
    private int totalVisitors;
    private int breakfastCount;
    private int lunchCount;
    private int dinnerCount;
}
