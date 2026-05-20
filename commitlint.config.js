/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",     // nueva funcionalidad
        "fix",      // corrección de bug
        "docs",     // solo documentación
        "style",    // formato, sin cambios funcionales
        "refactor", // refactorización sin feat ni fix
        "perf",     // mejora de rendimiento
        "test",     // añadir o corregir tests
        "build",    // sistema de build, dependencias
        "ci",       // configuración CI
        "chore",    // tareas de mantenimiento
        "revert",   // revert de un commit anterior
        "security", // corrección de seguridad
        "legal",    // cambios relacionados con cumplimiento normativo
      ],
    ],
    "scope-enum": [
      1,
      "always",
      [
        "web", "landing", "api", "ai-engine", "case-management",
        "ui-kit", "shared-types", "crypto", "config",
        "db", "infra", "ci", "docs", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8",
      ],
    ],
    "subject-max-length": [2, "always", 72],
    "subject-case": [2, "always", "lower-case"],
    "body-max-line-length": [1, "always", 100],
  },
};
