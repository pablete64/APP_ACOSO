package es.reker.safework.casemanagement.controller;

import es.reker.safework.casemanagement.dto.*;
import es.reker.safework.casemanagement.enums.EstadoExpediente;
import es.reker.safework.casemanagement.service.ExpedienteService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expedientes")
public class ExpedienteController {

    private final ExpedienteService expedienteService;

    public ExpedienteController(ExpedienteService expedienteService) {
        this.expedienteService = expedienteService;
    }

    // ── POST /api/v1/expedientes ──────────────────────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('RESPONSABLE_IGUALDAD', 'RRHH_LEGAL')")
    public ExpedienteResumen crear(
            @Valid @RequestBody CrearExpedienteRequest req,
            Authentication auth
    ) {
        UUID autorId = (UUID) auth.getPrincipal();
        return expedienteService.crear(req, autorId);
    }

    // ── GET /api/v1/expedientes ───────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_IGUALDAD', 'RRHH_LEGAL', 'INSPECTOR')")
    public Map<String, Object> listar(
            @RequestParam UUID empresaId,
            @RequestParam(required = false) EstadoExpediente estado,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return expedienteService.listar(empresaId, estado, page, size);
    }

    // ── GET /api/v1/expedientes/{id} ──────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IGUALDAD', 'RRHH_LEGAL', 'INSPECTOR')")
    public ExpedienteDetalle detalle(@PathVariable UUID id) {
        return expedienteService.detalle(id);
    }

    // ── PATCH /api/v1/expedientes/{id}/estado ─────────────────────────────────

    @PatchMapping("/{id}/estado")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('RESPONSABLE_IGUALDAD', 'RRHH_LEGAL')")
    public void cambiarEstado(
            @PathVariable UUID id,
            @Valid @RequestBody CambiarEstadoRequest req,
            Authentication auth
    ) {
        UUID autorId = (UUID) auth.getPrincipal();
        expedienteService.cambiarEstado(id, req, autorId);
    }

    // ── POST /api/v1/expedientes/{id}/eventos ─────────────────────────────────

    @PostMapping("/{id}/eventos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('RESPONSABLE_IGUALDAD', 'RRHH_LEGAL')")
    public EventoResponse registrarEvento(
            @PathVariable UUID id,
            @Valid @RequestBody NuevoEventoRequest req,
            Authentication auth
    ) {
        UUID autorId = (UUID) auth.getPrincipal();
        return expedienteService.registrarEvento(id, req, autorId);
    }

    // ── POST /api/v1/expedientes/{id}/firmar ──────────────────────────────────

    @PostMapping("/{id}/firmar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('RESPONSABLE_IGUALDAD', 'RRHH_LEGAL')")
    public void firmar(
            @PathVariable UUID id,
            @Valid @RequestBody FirmarRequest req
    ) {
        expedienteService.firmar(id, req);
    }

    // ── GET /api/v1/expedientes/{id}/exportar ────────────────────────────────

    @GetMapping("/{id}/exportar")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IGUALDAD', 'RRHH_LEGAL', 'INSPECTOR')")
    public ResponseEntity<byte[]> exportar(@PathVariable UUID id) {
        byte[] contenido = expedienteService.exportar(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDisposition(
                ContentDisposition.attachment().filename("expediente-" + id + ".json").build()
        );
        return ResponseEntity.ok().headers(headers).body(contenido);
    }

    // ── GET /api/v1/expedientes/{id}/plazos ──────────────────────────────────

    @GetMapping("/{id}/plazos")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IGUALDAD', 'RRHH_LEGAL', 'INSPECTOR')")
    public List<PlazoResponse> plazos(@PathVariable UUID id) {
        return expedienteService.plazos(id);
    }
}
