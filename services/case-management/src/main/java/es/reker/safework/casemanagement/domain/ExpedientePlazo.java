package es.reker.safework.casemanagement.domain;

import es.reker.safework.casemanagement.enums.TipoPlazo;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "expediente_plazos")
@Getter
@Setter
@NoArgsConstructor
public class ExpedientePlazo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expediente_id", nullable = false)
    private Expediente expediente;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_plazo", nullable = false, length = 30)
    private TipoPlazo tipoPlazo;

    @Column(name = "fecha_limite", nullable = false)
    private LocalDate fechaLimite;

    // Artículo o norma que fija el plazo
    @Column(name = "base_normativa", nullable = false, length = 200)
    private String baseNormativa;

    @Column(name = "completado", nullable = false)
    private boolean completado = false;

    @Column(name = "fecha_completado")
    private OffsetDateTime fechaCompletado;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = OffsetDateTime.now();
    }
}
