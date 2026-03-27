package com.temple.backend.service;

import com.temple.backend.repository.GoogleSheetsRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

@Service
public class SheetInitService {

    private final GoogleSheetsRepository repository;

    public SheetInitService(GoogleSheetsRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        try {
            repository.initializeSheets();
            System.out.println("✅ Google Sheets initialized successfully!");
        } catch (Exception e) {
            System.err.println("⚠️ Failed to initialize Google Sheets: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
