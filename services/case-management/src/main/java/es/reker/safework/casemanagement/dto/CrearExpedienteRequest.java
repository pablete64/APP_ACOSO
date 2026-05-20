package es.reker.safework.casemanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CrearExpedienteRequest(
        @NotNull UUID denunciaId,
        @NotNull UUID empresaId,
        @NotBlank @Size(max = 50) String tipoAcoso,
        UUID instructorId
) {}
