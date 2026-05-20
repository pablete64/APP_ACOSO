package es.reker.safework.casemanagement.dto;

import es.reker.safework.casemanagement.enums.TipoEvento;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record EventoResponse(
        UUID id,
        TipoEvento tipoEvento,
        UUID autorId,
        String descripcionCifrada,
        String ivB64,
        String hashSha256,
        String selloTsa,
        String tsaPolicy,
        boolean firmado,
        List<Map<String, String>> documentos,
        OffsetDateTime createdAt
) {}
