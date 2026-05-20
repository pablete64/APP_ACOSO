package es.reker.safework.casemanagement.security;

import es.reker.safework.casemanagement.tenant.TenantContext;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain
    ) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = jwtService.parseAndValidate(header.substring(7));

            if (!"access".equals(claims.get("type"))) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Tipo de token incorrecto");
                return;
            }

            // Inyectar tenant schema en ThreadLocal
            String schema = jwtService.extractTenantSchema(claims);
            TenantContext.set(schema);

            // Principal con perfil como authority
            String perfil = jwtService.extractPerfil(claims);
            var auth = new UsernamePasswordAuthenticationToken(
                    jwtService.extractUserId(claims),
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + perfil.toUpperCase()))
            );
            auth.setDetails(claims);
            SecurityContextHolder.getContext().setAuthentication(auth);

        } catch (JwtException | IllegalArgumentException e) {
            TenantContext.clear();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token inválido o expirado");
            return;
        }

        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            SecurityContextHolder.clearContext();
        }
    }
}
