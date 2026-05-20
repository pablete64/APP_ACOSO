package es.reker.safework.casemanagement.domain;

import es.reker.safework.casemanagement.enums.TipoEvento;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Registro inmutable de un evento en el expediente.
 * Una vez persistido, no se actualiza: hash_sha256 + sello_tsa garantizan integridad.
 */
@Entity
@Table(name = "expediente_eventos")
@Getter
@Setter
@NoArgsConstructor
public class ExpedienteEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expediente_id", nullable = false)
    private Expediente expediente;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_evento", nullable = false, length = 30)
    private TipoEvento tipoEvento;

    @Column(name = "autor_id")
    private UUID autorId;

    // Descripción cifrada en cliente (servidor almacena ciphertext)
    @Column(name = "descripcion_cifrada", columnDefinition = "TEXT")
    private String descripcionCifrada;

    @Column(name = "iv_b64", length = 32)
    private String ivB64;

    // SHA-256 del contenido del evento para integridad
    @Column(name = "hash_sha256", nullable = false, length = 64)
    private String hashSha256;

    // Token de sellado de tiempo TSA (Base64 DER)
    @Column(name = "sello_tsa", columnDefinition = "TEXT")
    private String selloTsa;

    // Política TSA usada (OID o URL)
    @Column(name = "tsa_policy", length = 200)
    private String tsaPolicy;

    // Firma digital CAdES del autor (Base64 DER)
    @Column(name = "firma_digital", columnDefinition = "TEXT")
    private String firmaDigital;

    // Metadatos adicionales (nombre archivo, mime, storage_key)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "documentos", columnDefinition = "jsonb")
    private List<Map<String, String>> documentos;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = OffsetDateTime.now();
    }
}
