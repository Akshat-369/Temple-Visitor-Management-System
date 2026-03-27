package com.temple.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private String id;
    private String type; // NEW_VISIT, APPROVED, REJECTED
    private String message;
    private String visitId;
    private String timestamp;
    private boolean read;
}
