package com.temple.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitRequestDTO {
    private String visitId;

    @NotBlank(message = "Mandal name is required")
    private String mandalName;

    @NotBlank(message = "Representative name is required")
    private String representativeName;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be 10 digits")
    private String representativePhone;

    @Min(value = 1, message = "Minimum 1 representative")
    private int numberOfRepresentatives = 1;

    @NotBlank(message = "From date is required")
    private String fromDate;

    @NotBlank(message = "To date is required")
    private String toDate;

    private String arrivalTime;

    @Min(value = 1, message = "At least 1 visitor required")
    private int totalVisitors;

    @NotNull(message = "Meal plans are required")
    private List<MealPlanDTO> mealPlans;

    private int numberOfKids;
    private int numberOfElderly;
    private String specialRequirements;
    private String notes;
    private String status;
    private String timestamp;
}
