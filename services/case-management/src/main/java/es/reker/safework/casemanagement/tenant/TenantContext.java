package es.reker.safework.casemanagement.tenant;

/**
 * ThreadLocal que transporta el schema del tenant desde el JWT hasta el DataSource.
 * Se limpia en el filter tras cada request para evitar leaks entre threads del pool.
 */
public final class TenantContext {

    private static final ThreadLocal<String> CURRENT_SCHEMA = new ThreadLocal<>();
    private static final java.util.regex.Pattern VALID = java.util.regex.Pattern.compile("^empresa_[a-z0-9]{1,20}$");

    private TenantContext() {}

    public static void set(String schema) {
        if (schema == null || !VALID.matcher(schema).matches()) {
            throw new IllegalArgumentException("Schema de tenant inválido: " + schema);
        }
        CURRENT_SCHEMA.set(schema);
    }

    public static String get() {
        return CURRENT_SCHEMA.get();
    }

    public static void clear() {
        CURRENT_SCHEMA.remove();
    }
}
