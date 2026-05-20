package es.reker.safework.casemanagement.dto;

import es.reker.safework.casemanagement.enums.EstadoExpediente;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ExpedienteResumen(
        UUID id,
        String referencia,
        UUID denunciaId,
        String tipoAcoso,
        EstadoExpediente estado,
        UUID instructorId,
        OffsetDateTime fechaApertura,
        OffsetDateTime fechaCierre,
        int totalEventos,
        int plazosVencidos,
        OffsetDateTime updatedAt
) {}
