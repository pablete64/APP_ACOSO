package es.reker.safework.casemanagement.domain;

import es.reker.safework.casemanagement.enums.EstadoExpediente;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "expedientes")
@Getter
@Setter
@NoArgsConstructor
public class Expediente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "referencia", nullable = false, unique = true, length = 30)
    private String referencia;  // EXP-YYYY-NNN

    @Column(name = "denuncia_id", nullable = false)
    private UUID denunciaId;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 30)
    private EstadoExpediente estado = EstadoExpediente.ABIERTO;

    @Column(name = "instructor_id")
    private UUID instructorId;

    @Column(name = "tipo_acoso", nullable = false, length = 50)
    private String tipoAcoso;

    @Column(name = "fecha_apertura", nullable = false)
    private OffsetDateTime fechaApertura;

    @Column(name = "fecha_cierre")
    private OffsetDateTime fechaCierre;

    // Hash SHA-256 del paquete exportado más reciente
    @Column(name = "hash_exportacion", length = 64)
    private String hashExportacion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadatos", columnDefinition = "jsonb")
    private Map<String, Object> metadatos;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "expediente", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    private List<ExpedienteEvento> eventos = new ArrayList<>();

    @OneToMany(mappedBy = "expediente", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("fechaLimite ASC")
    private List<ExpedientePlazo> plazos = new ArrayList<>();

    @PrePersist
    void prePersist() {
        var now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.fechaApertura = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
