package es.reker.safework.casemanagement.service;

import org.bouncycastle.asn1.ASN1ObjectIdentifier;
import org.bouncycastle.tsp.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Sellado de tiempo conforme a RFC 3161.
 *
 * En dev usa stub (retorna token sintético). En prod conecta con TSA eIDAS cualificada
 * (configurable: FNMT, GlobalSign, etc.).
 */
@Service
public class TsaService {

    private static final Logger log = LoggerFactory.getLogger(TsaService.class);

    // OID SHA-256
    private static final ASN1ObjectIdentifier SHA256_OID =
            new ASN1ObjectIdentifier("2.16.840.1.101.3.4.2.1");

    @Value("${tsa.url:}")
    private String tsaUrl;

    @Value("${tsa.policy-oid:0.4.0.2023.1.1}")
    private String tsaPolicyOid;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    /**
     * Genera un sello de tiempo para los bytes proporcionados.
     * @return Base64(DER(TimeStampToken)) o token de stub en dev
     */
    public String sellar(byte[] contenido) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(contenido);

            if (isDevMode()) {
                return stubToken(digest);
            }

            return requestTsa(digest);
        } catch (Exception e) {
            log.error("Error al sellar con TSA: {}", e.getMessage(), e);
            throw new RuntimeException("Fallo en sellado de tiempo", e);
        }
    }

    private boolean isDevMode() {
        return tsaUrl == null || tsaUrl.isBlank() || activeProfile.contains("dev");
    }

    private String requestTsa(byte[] digest) throws Exception {
        TimeStampRequestGenerator gen = new TimeStampRequestGenerator();
        gen.setCertReq(true);
        gen.setReqPolicy(new ASN1ObjectIdentifier(tsaPolicyOid));

        BigInteger nonce = new BigInteger(64, new SecureRandom());
        TimeStampRequest request = gen.generate(SHA256_OID, digest, nonce);
        byte[] encoded = request.getEncoded();

        HttpURLConnection conn = (HttpURLConnection) URI.create(tsaUrl).toURL().openConnection();
        conn.setDoOutput(true);
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/timestamp-query");
        conn.setConnectTimeout(10_000);
        conn.setReadTimeout(10_000);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(encoded);
        }

        if (conn.getResponseCode() != 200) {
            throw new RuntimeException("TSA respondió: " + conn.getResponseCode());
        }

        try (InputStream is = conn.getInputStream()) {
            TimeStampResponse response = new TimeStampResponse(is.readAllBytes());
            response.validate(request);
            return Base64.getEncoder().encodeToString(
                    response.getTimeStampToken().getEncoded()
            );
        }
    }

    // En dev devuelve un token sintético legible para depuración
    private String stubToken(byte[] digest) {
        String stub = "STUB-TSA|" + Base64.getEncoder().encodeToString(digest)
                + "|" + java.time.Instant.now().toString();
        return Base64.getEncoder().encodeToString(stub.getBytes(StandardCharsets.UTF_8));
    }
}
