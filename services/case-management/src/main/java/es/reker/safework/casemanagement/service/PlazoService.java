package es.reker.safework.casemanagement.service;

import es.reker.safework.casemanagement.domain.Expediente;
import es.reker.safework.casemanagement.domain.ExpedientePlazo;
import es.reker.safework.casemanagement.dto.PlazoResponse;
import es.reker.safework.casemanagement.enums.TipoPlazo;
import es.reker.safework.casemanagement.repository.ExpedientePlazoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class PlazoService {

    private static final Logger log = LoggerFactory.getLogger(PlazoService.class);

    private final ExpedientePlazoRepository plazoRepo;

    public PlazoService(ExpedientePlazoRepository plazoRepo) {
        this.plazoRepo = plazoRepo;
    }

    /**
     * Crea los plazos legales estándar para un expediente recién abierto.
     * Base: Ley 2/2023 + Protocolo de acoso laboral (INSST).
     */
    @Transactional
    public void crearPlazosEstandar(Expediente expediente) {
        LocalDate apertura = expediente.getFechaApertura().toLocalDate();

        crearPlazo(expediente, TipoPlazo.INVESTIGACION,
                apertura.plusMonths(3),
                "Ley 2/2023 art. 9.2 — instrucción máx. 3 meses prorrogables");

        crearPlazo(expediente, TipoPlazo.RESPUESTA_DENUNCIANTE,
                apertura.plusDays(7),
                "Ley 2/2023 art. 9.1 — acuse de recibo en 7 días");

        crearPlazo(expediente, TipoPlazo.RESOLUCION,
                apertura.plusMonths(3),
                "Ley 2/2023 art. 9.2 — resolución motivada");

        crearPlazo(expediente, TipoPlazo.CONSERVACION,
                apertura.plusYears(5),
                "Ley 2/2023 art. 24 — conservación 5 años mínimo");
    }

    private void crearPlazo(Expediente expediente, TipoPlazo tipo, LocalDate limite, String norma) {
        var plazo = new ExpedientePlazo();
        plazo.setExpediente(expediente);
        plazo.setTipoPlazo(tipo);
        plazo.setFechaLimite(limite);
        plazo.setBaseNormativa(norma);
        plazoRepo.save(plazo);
    }

    public List<PlazoResponse> listarPorExpediente(java.util.UUID expedienteId) {
        return plazoRepo.findByExpedienteIdOrderByFechaLimiteAsc(expedienteId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PlazoResponse toResponse(ExpedientePlazo p) {
        LocalDate hoy = LocalDate.now();
        long dias = ChronoUnit.DAYS.between(hoy, p.getFechaLimite());
        String alerta = calcularAlerta(p, dias);
        return new PlazoResponse(
                p.getId(),
                p.getTipoPlazo(),
                p.getFechaLimite(),
                p.getBaseNormativa(),
                p.isCompletado(),
                p.getFechaCompletado(),
                (int) dias,
                alerta
        );
    }

    private String calcularAlerta(ExpedientePlazo p, long dias) {
        if (p.isCompletado()) return "ok";
        if (dias < 0) return "vencido";
        if (dias <= 7) return "proximo";
        return "ok";
    }

    /**
     * Cron diario: detecta plazos que vencen en 7, 3 o 1 días.
     * En esta versión loguea; en producción emitirá notificaciones (F5.5).
     */
    @Scheduled(cron = "0 0 8 * * MON-FRI")
    @Transactional(readOnly = true)
    public void alertarPlazosProximos() {
        LocalDate hoy = LocalDate.now();
        List<ExpedientePlazo> proximos = plazoRepo.findPlazosProximos(hoy, hoy.plusDays(7));
        for (ExpedientePlazo p : proximos) {
            long dias = ChronoUnit.DAYS.between(hoy, p.getFechaLimite());
            log.warn("PLAZO PRÓXIMO — expediente={} tipo={} vence={} dias={}",
                    p.getExpediente().getId(), p.getTipoPlazo(), p.getFechaLimite(), dias);
            // TODO F5.5: emitir notificación in-app + email a instructor_id
        }
    }
}
