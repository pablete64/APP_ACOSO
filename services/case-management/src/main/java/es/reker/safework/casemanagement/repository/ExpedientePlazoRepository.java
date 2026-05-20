package es.reker.safework.casemanagement.repository;

import es.reker.safework.casemanagement.domain.ExpedientePlazo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ExpedientePlazoRepository extends JpaRepository<ExpedientePlazo, UUID> {

    List<ExpedientePlazo> findByExpedienteIdOrderByFechaLimiteAsc(UUID expedienteId);

    // Plazos que vencen en los próximos N días y no están completados (para alertas)
    @Query("SELECT p FROM ExpedientePlazo p WHERE p.completado = false AND p.fechaLimite BETWEEN :desde AND :hasta")
    List<ExpedientePlazo> findPlazosProximos(LocalDate desde, LocalDate hasta);
}
