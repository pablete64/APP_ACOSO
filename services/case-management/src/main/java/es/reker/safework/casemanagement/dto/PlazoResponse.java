package es.reker.safework.casemanagement.dto;

import es.reker.safework.casemanagement.enums.TipoPlazo;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PlazoResponse(
        UUID id,
        TipoPlazo tipoPlazo,
        LocalDate fechaLimite,
        String baseNormativa,
        boolean completado,
        OffsetDateTime fechaCompletado,
        int diasRestantes,
        String alerta  // "ok" | "proximo" | "vencido"
) {}
