package es.reker.safework.casemanagement.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Valida JWT emitidos por el servicio Python (api).
 * En dev usa HMAC-SHA256 con JWT_SECRET compartido.
 * En prod usa RS256 con la clave pública del api.
 */
@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String jwtSecret;

    public Claims parseAndValidate(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractTenantSchema(Claims claims) {
        return claims.get("tenant_schema", String.class);
    }

    public UUID extractUserId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }

    public String extractPerfil(Claims claims) {
        return claims.get("perfil", String.class);
    }

    public UUID extractEmpresaId(Claims claims) {
        String raw = claims.get("empresa_id", String.class);
        return raw != null ? UUID.fromString(raw) : null;
    }
}
