package es.reker.safework.casemanagement.dto;

import es.reker.safework.casemanagement.enums.EstadoExpediente;
import jakarta.validation.constraints.NotNull;

public record CambiarEstadoRequest(@NotNull EstadoExpediente estado) {}
