package es.reker.safework.casemanagement.repository;

import es.reker.safework.casemanagement.domain.ExpedienteEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExpedienteEventoRepository extends JpaRepository<ExpedienteEvento, UUID> {
    List<ExpedienteEvento> findByExpedienteIdOrderByCreatedAtAsc(UUID expedienteId);
}
