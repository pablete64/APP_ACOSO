"use client";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

interface ParApoyo {
  id: string;
  usuario_id: string;
  nombre_visible: string;
  departamento: string | null;
  idiomas: string[];
  disponible: boolean;
  formacion_completada: boolean;
}

interface MediacionResumen {
  id: string;
  expediente_id: string | null;
  mediador_id: string | null;
  estado: "solicitada" | "en_proceso" | "completada" | "cancelada";
  created_at: string;
  updated_at: string;
}

interface RepresaliaResumen {
  id: string;
  denuncia_id: string | null;
  estado: "registrada" | "investigando" | "resuelta";
  created_at: string;
}

const ESTADO_MEDIACION: Record<string, string> = {
  solicitada:  "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  en_proceso:  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completada:  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelada:   "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const ESTADO_REPRESALIA: Record<string, string> = {
  registrada:   "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  investigando: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  resuelta:     "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

type Tab = "pares" | "mediacion" | "represalias";

export default function ApoyoPage() {
  const [tab, setTab] = useState<Tab>("pares");
  const { encrypt } = useCrypto();

  // ── Pares de apoyo ─────────────────────────────────────────────────────────
  const { data: pares, isLoading: cargandoPares } = useApiQuery(
    ["pares-apoyo"],
    () => apiClient.get<ParApoyo[]>("/api/v1/apoyo/pares").then((r) => r.data),
    { enabled: tab === "pares" }
  );

  // ── Mediaciones ────────────────────────────────────────────────────────────
  const { data: mediaciones, isLoading: cargandoMed, refetch: refetchMed } = useApiQuery(
    ["mediaciones"],
    () => apiClient.get<MediacionResumen[]>("/api/v1/apoyo/mediaciones").then((r) => r.data),
    { enabled: tab === "mediacion" }
  );

  const [motivoMediacion, setMotivoMediacion] = useState("");
  const [consentimientoMed, setConsentimientoMed] = useState(false);

  const solicitarMediacionMutation = useApiMutation(
    async (motivo: string) => {
      const { ciphertext_b64, iv_b64 } = await encrypt(motivo || "Sin motivo indicado");
      return apiClient.post("/api/v1/apoyo/mediaciones", {
        motivo_ciphertext: ciphertext_b64,
        motivo_iv_b64: iv_b64,
        consentimiento_ambas_partes: true,
      }).then((r) => r.data);
    },
    { onSuccess: () => { setMotivoMediacion(""); setConsentimientoMed(false); refetchMed(); } }
  );

  const cancelarMutation = useApiMutation(
    (id: string) => apiClient.delete(`/api/v1/apoyo/mediaciones/${id}`).then(() => undefined),
    { onSuccess: () => refetchMed() }
  );

  // ── Represalias ────────────────────────────────────────────────────────────
  const { data: represalias, isLoading: cargandoRep, refetch: refetchRep } = useApiQuery(
    ["represalias"],
    () => apiClient.get<RepresaliaResumen[]>("/api/v1/apoyo/represalias").then((r) => r.data),
    { enabled: tab === "represalias" }
  );

  const [descripcionRep, setDescripcionRep] = useState("");

  const represaliaMutation = useApiMutation(
    async (descripcion: string) => {
      const { ciphertext_b64, iv_b64 } = await encrypt(descripcion);
      return apiClient.post("/api/v1/apoyo/represalias", {
        descripcion_ciphertext: ciphertext_b64,
        descripcion_iv_b64: iv_b64,
      }).then((r) => r.data);
    },
    { onSuccess: () => { setDescripcionRep(""); refetchRep(); } }
  );

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Red de apoyo</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pares de apoyo, mediación y protección frente a represalias
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6" aria-label="Secciones">
          {(["pares", "mediacion", "represalias"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t === "pares" ? "Pares de apoyo" : t === "mediacion" ? "Mediación" : "Represalias"}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Pares de apoyo ────────────────────────────────────────────────── */}
      {tab === "pares" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Los pares de apoyo son compañeros/as formados voluntariamente para escuchar y orientar.
            Son confidenciales y no tienen poder disciplinario.
          </p>

          {cargandoPares && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}

          {pares && pares.length === 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay pares de apoyo disponibles. ¿Quieres ser el primero/a?
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Completa un curso de formación M3 y regístrate desde el perfil.
              </p>
            </div>
          )}

          {pares && pares.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {pares.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold text-sm shrink-0">
                    {p.nombre_visible.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.nombre_visible}</p>
                    {p.departamento && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.departamento}</p>
                    )}
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {p.idiomas.map((l) => (
                        <span key={l} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">
                          {l.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      p.disponible
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {p.disponible ? "Disponible" : "Ocupado"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Mediación ─────────────────────────────────────────────────────── */}
      {tab === "mediacion" && (
        <div className="space-y-6">
          {/* Formulario nueva mediación */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Solicitar mediación
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              La mediación es voluntaria, confidencial y puede cancelarse en cualquier momento.
              Ambas partes deben consentir. El motivo viaja cifrado — nadie del equipo puede leerlo.
            </p>
            <div className="space-y-3">
              <textarea
                value={motivoMediacion}
                onChange={(e) => setMotivoMediacion(e.target.value)}
                rows={3}
                placeholder="Describe brevemente la situación (cifrado en tu dispositivo)…"
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentimientoMed}
                  onChange={(e) => setConsentimientoMed(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Confirmo que ambas partes han expresado su consentimiento para iniciar la mediación.
                </span>
              </label>
              <button
                type="button"
                onClick={() => solicitarMediacionMutation.mutate(motivoMediacion)}
                disabled={!consentimientoMed || !motivoMediacion.trim() || solicitarMediacionMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-40 transition-colors"
              >
                {solicitarMediacionMutation.isPending ? "Enviando…" : "Solicitar mediación"}
              </button>
            </div>
          </div>

          {/* Lista de mediaciones */}
          {cargandoMed && (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}

          {mediaciones && mediaciones.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">No tienes mediaciones en curso.</p>
          )}

          {mediaciones && mediaciones.length > 0 && (
            <div className="space-y-2">
              {mediaciones.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_MEDIACION[m.estado]}`}>
                      {m.estado}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      Solicitada el {new Date(m.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  {m.estado !== "cancelada" && m.estado !== "completada" && (
                    <button
                      type="button"
                      onClick={() => cancelarMutation.mutate(m.id)}
                      disabled={cancelarMutation.isPending}
                      className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Represalias ───────────────────────────────────────────────────── */}
      {tab === "represalias" && (
        <div className="space-y-6">
          {/* Aviso legal */}
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
              ⚠ Protección frente a represalias — Ley 2/2023 art. 21
            </h2>
            <p className="text-xs text-red-600 dark:text-red-400">
              La ley prohíbe expresamente cualquier represalia contra quien haya presentado una denuncia.
              Este registro es confidencial y genera una alerta inmediata al equipo de Igualdad y RRHH.
              Tu descripción se cifra en tu dispositivo — el servidor nunca ve el texto en claro.
            </p>
          </div>

          {/* Formulario */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Registrar represalia
            </h2>
            <textarea
              value={descripcionRep}
              onChange={(e) => setDescripcionRep(e.target.value)}
              rows={4}
              placeholder="Describe qué ha ocurrido, cuándo y quién está implicado (se cifrará antes de enviar)…"
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="button"
              onClick={() => represaliaMutation.mutate(descripcionRep)}
              disabled={!descripcionRep.trim() || represaliaMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 transition-colors"
            >
              {represaliaMutation.isPending ? "Enviando…" : "🔒 Registrar (cifrado)"}
            </button>
          </div>

          {/* Historial */}
          {cargandoRep && (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}

          {represalias && represalias.length === 0 && represaliaMutation.isSuccess && (
            <div className="rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Represalia registrada. El equipo de Igualdad ha sido notificado.
              </p>
            </div>
          )}

          {represalias && represalias.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Mis registros
              </h3>
              {represalias.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 flex items-center gap-3"
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_REPRESALIA[r.estado]}`}>
                    {r.estado}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(r.created_at).toLocaleDateString("es-ES")}
                  </p>
                  <span className="ml-auto text-xs text-gray-300 dark:text-gray-600 font-mono">
                    🔒 cifrado
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
