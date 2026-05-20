package es.reker.safework.casemanagement.dto;

import es.reker.safework.casemanagement.enums.TipoEvento;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record NuevoEventoRequest(
        @NotNull TipoEvento tipoEvento,
        // Descripción cifrada en cliente (AES-256-GCM)
        @Size(max = 50000) String descripcionCifrada,
        @Size(max = 32) String ivB64,
        // Documentos asociados: [{nombre, mime, storage_key, sha256}]
        List<Map<String, String>> documentos
) {}
