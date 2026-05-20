package es.reker.safework.casemanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record FirmarRequest(
        @NotNull UUID eventoId,
        // Firma CAdES-BES en Base64 (generada en cliente con Autofirma/DNIe)
        @NotBlank String firmaBase64,
        // Certificado del firmante (cadena PEM o Base64 DER)
        @NotBlank String certificadoBase64
) {}
