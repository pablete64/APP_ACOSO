package es.reker.safework.casemanagement.dto;

import es.reker.safework.casemanagement.enums.EstadoExpediente;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ExpedienteDetalle(
        UUID id,
        String referencia,
        UUID denunciaId,
        UUID empresaId,
        String tipoAcoso,
        EstadoExpediente estado,
        UUID instructorId,
        OffsetDateTime fechaApertura,
        OffsetDateTime fechaCierre,
        List<EventoResponse> eventos,
        List<PlazoResponse> plazos,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
