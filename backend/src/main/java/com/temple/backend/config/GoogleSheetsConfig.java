package com.temple.backend.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Collections;

@Configuration
public class GoogleSheetsConfig {

    @Value("${google.sheets.service-account-email}")
    private String serviceAccountEmail;

    @Value("${google.sheets.private-key}")
    private String privateKeyStr;

    @Value("${google.sheets.application-name}")
    private String applicationName;

    @Bean
    public Sheets sheetsService() throws GeneralSecurityException, IOException {
        GoogleCredentials credentials = createCredentials();
        return new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName(applicationName)
                .build();
    }

    private GoogleCredentials createCredentials() throws GeneralSecurityException {
        try {
            String pkcs8Pem = privateKeyStr
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\\\n", "")
                    .replaceAll("\\s", "");

            byte[] encoded = Base64.getDecoder().decode(pkcs8Pem);
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            PrivateKey privateKey = kf.generatePrivate(keySpec);

            GoogleCredentials credentials = ServiceAccountCredentials.newBuilder()
                    .setClientEmail(serviceAccountEmail)
                    .setPrivateKey(privateKey)
                    .setScopes(Collections.singletonList(SheetsScopes.SPREADSHEETS))
                    .build();
            return credentials;
        } catch (Exception e) {
            throw new GeneralSecurityException("Failed to create Google credentials", e);
        }
    }
}
