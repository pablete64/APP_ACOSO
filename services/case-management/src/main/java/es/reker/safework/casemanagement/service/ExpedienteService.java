package es.reker.safework.casemanagement.service;

import es.reker.safework.casemanagement.domain.Expediente;
import es.reker.safework.casemanagement.domain.ExpedienteEvento;
import es.reker.safework.casemanagement.dto.*;
import es.reker.safework.casemanagement.enums.EstadoExpediente;
import es.reker.safework.casemanagement.enums.TipoEvento;
import es.reker.safework.casemanagement.exception.ConflictException;
import es.reker.safework.casemanagement.exception.NotFoundException;
import es.reker.safework.casemanagement.repository.ExpedienteEventoRepository;
import es.reker.safework.casemanagement.repository.ExpedienteRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ExpedienteService {

    private final ExpedienteRepository expedienteRepo;
    private final ExpedienteEventoRepository eventoRepo;
    private final TsaService tsaService;
    private final PlazoService plazoService;

    public ExpedienteService(
            ExpedienteRepository expedienteRepo,
            ExpedienteEventoRepository eventoRepo,
            TsaService tsaService,
            PlazoService plazoService
    ) {
        this.expedienteRepo = expedienteRepo;
        this.eventoRepo = eventoRepo;
        this.tsaService = tsaService;
        this.plazoService = plazoService;
    }

    // ── Crear ─────────────────────────────────────────────────────────────────

    @Transactional
    public ExpedienteResumen crear(CrearExpedienteRequest req, UUID autorId) {
        if (expedienteRepo.existsByDenunciaId(req.denunciaId())) {
            throw new ConflictException("Ya existe un expediente para esta denuncia");
        }

        var exp = new Expediente();
        exp.setDenunciaId(req.denunciaId());
        exp.setEmpresaId(req.empresaId());
        exp.setTipoAcoso(req.tipoAcoso());
        exp.setInstructorId(req.instructorId());
        exp.setEstado(EstadoExpediente.ABIERTO);
        exp.setReferencia(generarReferencia());
        expedienteRepo.save(exp);

        // Evento de apertura con sello TSA
        registrarEvento(exp, TipoEvento.APERTURA, autorId,
                "Expediente abierto desde denuncia " + req.denunciaId(), null, null, null);

        // Plazos legales estándar (Ley 2/2023)
        plazoService.crearPlazosEstandar(exp);

        return toResumen(exp);
    }

    // ── Listar ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> listar(UUID empresaId, EstadoExpediente estado, int page, int size) {
        var pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        Page<Expediente> resultado = estado != null
                ? expedienteRepo.findByEmpresaIdAndEstado(empresaId, estado, pageable)
                : expedienteRepo.findByEmpresaId(empresaId, pageable);

        return Map.of(
                "items", resultado.getContent().stream().map(this::toResumen).toList(),
                "total", resultado.getTotalElements(),
                "page", page,
                "size", size
        );
    }

    // ── Detalle ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ExpedienteDetalle detalle(UUID id) {
        Expediente exp = expedienteRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Expediente no encontrado"));

        List<EventoResponse> eventos = eventoRepo
                .findByExpedienteIdOrderByCreatedAtAsc(id)
                .stream()
                .map(this::toEventoResponse)
                .toList();

        List<PlazoResponse> plazos = plazoService.listarPorExpediente(id);

        return new ExpedienteDetalle(
                exp.getId(), exp.getReferencia(), exp.getDenunciaId(),
                exp.getEmpresaId(), exp.getTipoAcoso(), exp.getEstado(),
                exp.getInstructorId(), exp.getFechaApertura(), exp.getFechaCierre(),
                eventos, plazos, exp.getCreatedAt(), exp.getUpdatedAt()
        );
    }

    // ── Cambiar estado ────────────────────────────────────────────────────────

    @Transactional
    public void cambiarEstado(UUID id, CambiarEstadoRequest req, UUID autorId) {
        Expediente exp = expedienteRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Expediente no encontrado"));

        EstadoExpediente anterior = exp.getEstado();
        exp.setEstado(req.estado());
        if (req.estado() == EstadoExpediente.CERRADO || req.estado() == EstadoExpediente.ARCHIVADO) {
            exp.setFechaCierre(OffsetDateTime.now());
        }
        expedienteRepo.save(exp);

        registrarEvento(exp, TipoEvento.DECISION, autorId,
                "Estado cambiado de " + anterior + " a " + req.estado(), null, null, null);
    }

    // ── Registrar evento ──────────────────────────────────────────────────────

    @Transactional
    public EventoResponse registrarEvento(
            UUID expedienteId,
            NuevoEventoRequest req,
            UUID autorId
    ) {
        Expediente exp = expedienteRepo.findById(expedienteId)
                .orElseThrow(() -> new NotFoundException("Expediente no encontrado"));
        return toEventoResponse(
                registrarEvento(exp, req.tipoEvento(), autorId,
                        req.descripcionCifrada(), req.ivB64(), req.documentos(), null)
        );
    }

    // ── Firmar evento ─────────────────────────────────────────────────────────

    @Transactional
    public void firmar(UUID expedienteId, FirmarRequest req) {
        var evento = eventoRepo.findById(req.eventoId())
                .orElseThrow(() -> new NotFoundException("Evento no encontrado"));

        if (!evento.getExpediente().getId().equals(expedienteId)) {
            throw new IllegalArgumentException("El evento no pertenece al expediente indicado");
        }
        if (evento.getFirmaDigital() != null) {
            throw new ConflictException("El evento ya está firmado");
        }

        evento.setFirmaDigital(req.firmaBase64());
        eventoRepo.save(evento);

        // Actualizar estado del expediente si estaba pendiente de firma
        Expediente exp = evento.getExpediente();
        if (exp.getEstado() == EstadoExpediente.PENDIENTE_FIRMA) {
            exp.setEstado(EstadoExpediente.CERRADO);
            exp.setFechaCierre(OffsetDateTime.now());
            expedienteRepo.save(exp);
        }
    }

    // ── Exportación ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public byte[] exportar(UUID id) {
        Expediente exp = expedienteRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Expediente no encontrado"));

        // Construye un JSON canónico del expediente completo para exportar
        // En producción se empaqueta en ZIP firmado con TSA global
        String json = buildExportJson(exp);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);

        // Actualiza el hash de exportación
        try {
            String hash = HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(bytes)
            );
            exp.setHashExportacion(hash);
            expedienteRepo.save(exp);
        } catch (Exception e) {
            throw new RuntimeException("Error calculando hash de exportación", e);
        }

        return bytes;
    }

    // ── Plazos ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PlazoResponse> plazos(UUID expedienteId) {
        if (!expedienteRepo.existsById(expedienteId)) {
            throw new NotFoundException("Expediente no encontrado");
        }
        return plazoService.listarPorExpediente(expedienteId);
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private ExpedienteEvento registrarEvento(
            Expediente exp, TipoEvento tipo, UUID autorId,
            String descripcionCifrada, String ivB64,
            List<Map<String, String>> documentos,
            String firmaBase64
    ) {
        var evento = new ExpedienteEvento();
        evento.setExpediente(exp);
        evento.setTipoEvento(tipo);
        evento.setAutorId(autorId);
        evento.setDescripcionCifrada(descripcionCifrada);
        evento.setIvB64(ivB64);
        evento.setDocumentos(documentos);
        evento.setFirmaDigital(firmaBase64);

        // Calcular hash SHA-256 del contenido del evento para integridad
        String contenido = tipo.name() + "|" + (descripcionCifrada != null ? descripcionCifrada : "")
                + "|" + (autorId != null ? autorId : "") + "|" + java.time.Instant.now();
        try {
            byte[] contenidoBytes = contenido.getBytes(StandardCharsets.UTF_8);
            evento.setHashSha256(
                    HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenidoBytes))
            );
            // Sellar con TSA
            String sello = tsaService.sellar(contenidoBytes);
            evento.setSelloTsa(sello);
        } catch (Exception e) {
            throw new RuntimeException("Error en hash/TSA del evento", e);
        }

        return eventoRepo.save(evento);
    }

    private String generarReferencia() {
        int year = LocalDate.now().getYear();
        String prefix = "EXP-" + year + "-";
        int seq = expedienteRepo.findMaxSequenceForYear(prefix) + 1;
        return prefix + String.format("%04d", seq);
    }

    private ExpedienteResumen toResumen(Expediente exp) {
        long plazosVencidos = exp.getPlazos().stream()
                .filter(p -> !p.isCompletado() && p.getFechaLimite().isBefore(LocalDate.now()))
                .count();
        return new ExpedienteResumen(
                exp.getId(), exp.getReferencia(), exp.getDenunciaId(),
                exp.getTipoAcoso(), exp.getEstado(), exp.getInstructorId(),
                exp.getFechaApertura(), exp.getFechaCierre(),
                exp.getEventos().size(), (int) plazosVencidos,
                exp.getUpdatedAt()
        );
    }

    private EventoResponse toEventoResponse(ExpedienteEvento e) {
        return new EventoResponse(
                e.getId(), e.getTipoEvento(), e.getAutorId(),
                e.getDescripcionCifrada(), e.getIvB64(),
                e.getHashSha256(), e.getSelloTsa(), e.getTsaPolicy(),
                e.getFirmaDigital() != null,
                e.getDocumentos(), e.getCreatedAt()
        );
    }

    private String buildExportJson(Expediente exp) {
        // JSON canónico simple — en prod usar jackson ObjectMapper inyectado
        return """
                {
                  "referencia": "%s",
                  "denunciaId": "%s",
                  "empresaId": "%s",
                  "estado": "%s",
                  "tipoAcoso": "%s",
                  "fechaApertura": "%s",
                  "exportadoEn": "%s",
                  "expedienteId": "%s"
                }
                """.formatted(
                exp.getReferencia(), exp.getDenunciaId(), exp.getEmpresaId(),
                exp.getEstado(), exp.getTipoAcoso(), exp.getFechaApertura(),
                OffsetDateTime.now(), exp.getId()
        );
    }
}
