package es.reker.safework.casemanagement;

import es.reker.safework.casemanagement.domain.Expediente;
import es.reker.safework.casemanagement.dto.CrearExpedienteRequest;
import es.reker.safework.casemanagement.dto.ExpedienteResumen;
import es.reker.safework.casemanagement.enums.EstadoExpediente;
import es.reker.safework.casemanagement.exception.ConflictException;
import es.reker.safework.casemanagement.repository.ExpedienteEventoRepository;
import es.reker.safework.casemanagement.repository.ExpedienteRepository;
import es.reker.safework.casemanagement.service.ExpedienteService;
import es.reker.safework.casemanagement.service.PlazoService;
import es.reker.safework.casemanagement.service.TsaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExpedienteServiceTest {

    @Mock private ExpedienteRepository expedienteRepo;
    @Mock private ExpedienteEventoRepository eventoRepo;
    @Mock private TsaService tsaService;
    @Mock private PlazoService plazoService;

    private ExpedienteService sut;

    @BeforeEach
    void setUp() {
        sut = new ExpedienteService(expedienteRepo, eventoRepo, tsaService, plazoService);
    }

    @Test
    @DisplayName("crear — genera referencia EXP-YYYY-NNNN y persiste")
    void crear_ok() {
        UUID denunciaId = UUID.randomUUID();
        UUID empresaId  = UUID.randomUUID();
        var req = new CrearExpedienteRequest(denunciaId, empresaId, "acoso_moral", null);

        when(expedienteRepo.existsByDenunciaId(denunciaId)).thenReturn(false);
        when(expedienteRepo.findMaxSequenceForYear(anyString())).thenReturn(0);

        var saved = expedienteFromReq(req);
        when(expedienteRepo.save(any())).thenReturn(saved);
        when(eventoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(tsaService.sellar(any())).thenReturn("STUB-TSA");

        ExpedienteResumen result = sut.crear(req, UUID.randomUUID());

        assertThat(result).isNotNull();
        assertThat(result.referencia()).matches("EXP-\\d{4}-\\d{4}");
        assertThat(result.estado()).isEqualTo(EstadoExpediente.ABIERTO);
        verify(plazoService).crearPlazosEstandar(any());
    }

    @Test
    @DisplayName("crear — lanza ConflictException si la denuncia ya tiene expediente")
    void crear_conflicto() {
        UUID denunciaId = UUID.randomUUID();
        var req = new CrearExpedienteRequest(denunciaId, UUID.randomUUID(), "acoso_moral", null);

        when(expedienteRepo.existsByDenunciaId(denunciaId)).thenReturn(true);

        assertThatThrownBy(() -> sut.crear(req, UUID.randomUUID()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Ya existe un expediente");
    }

    @Test
    @DisplayName("detalle — lanza NotFoundException si el id no existe")
    void detalle_not_found() {
        UUID id = UUID.randomUUID();
        when(expedienteRepo.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sut.detalle(id))
                .isInstanceOf(es.reker.safework.casemanagement.exception.NotFoundException.class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Expediente expedienteFromReq(CrearExpedienteRequest req) {
        var e = new Expediente();
        e.setDenunciaId(req.denunciaId());
        e.setEmpresaId(req.empresaId());
        e.setTipoAcoso(req.tipoAcoso());
        e.setEstado(EstadoExpediente.ABIERTO);
        e.setReferencia("EXP-2026-0001");
        e.setEventos(new ArrayList<>());
        e.setPlazos(new ArrayList<>());
        e.setFechaApertura(OffsetDateTime.now());
        e.setCreatedAt(OffsetDateTime.now());
        e.setUpdatedAt(OffsetDateTime.now());
        return e;
    }
}
