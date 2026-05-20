package es.reker.safework.casemanagement;

import es.reker.safework.casemanagement.service.TsaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.*;

class TsaServiceTest {

    @Test
    @DisplayName("stub mode — retorna token sintético Base64 válido")
    void stub_token_valido() {
        TsaService svc = new TsaService();
        ReflectionTestUtils.setField(svc, "tsaUrl", "");
        ReflectionTestUtils.setField(svc, "tsaPolicyOid", "0.4.0.2023.1.1");
        ReflectionTestUtils.setField(svc, "activeProfile", "dev");

        String token = svc.sellar("contenido de prueba".getBytes(StandardCharsets.UTF_8));

        assertThat(token).isNotBlank();
        // Debe ser Base64 válido
        assertThatCode(() -> Base64.getDecoder().decode(token)).doesNotThrowAnyException();
        // El stub debe contener el prefijo esperado
        String decoded = new String(Base64.getDecoder().decode(token), StandardCharsets.UTF_8);
        assertThat(decoded).startsWith("STUB-TSA|");
    }

    @Test
    @DisplayName("stub mode — dos contenidos distintos producen tokens distintos")
    void stub_tokens_distintos() {
        TsaService svc = new TsaService();
        ReflectionTestUtils.setField(svc, "tsaUrl", "");
        ReflectionTestUtils.setField(svc, "tsaPolicyOid", "0.4.0.2023.1.1");
        ReflectionTestUtils.setField(svc, "activeProfile", "dev");

        String t1 = svc.sellar("contenido A".getBytes(StandardCharsets.UTF_8));
        String t2 = svc.sellar("contenido B".getBytes(StandardCharsets.UTF_8));

        assertThat(t1).isNotEqualTo(t2);
    }
}
