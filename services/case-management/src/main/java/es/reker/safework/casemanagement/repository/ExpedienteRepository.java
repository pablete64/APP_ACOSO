package es.reker.safework.casemanagement.repository;

import es.reker.safework.casemanagement.domain.Expediente;
import es.reker.safework.casemanagement.enums.EstadoExpediente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ExpedienteRepository extends JpaRepository<Expediente, UUID> {

    Optional<Expediente> findByReferencia(String referencia);

    Page<Expediente> findByEmpresaId(UUID empresaId, Pageable pageable);

    Page<Expediente> findByEmpresaIdAndEstado(UUID empresaId, EstadoExpediente estado, Pageable pageable);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(e.referencia, 10) AS int)), 0) FROM Expediente e WHERE e.referencia LIKE :prefix%")
    int findMaxSequenceForYear(@Param("prefix") String prefix);

    boolean existsByDenunciaId(UUID denunciaId);
}
