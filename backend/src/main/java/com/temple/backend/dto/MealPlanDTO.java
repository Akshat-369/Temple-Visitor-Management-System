package com.temple.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MealPlanDTO {
    private String date;
    private boolean breakfastRequired;
    private int breakfastCount;
    private boolean lunchRequired;
    private int lunchCount;
    private boolean dinnerRequired;
    private int dinnerCount;
}
