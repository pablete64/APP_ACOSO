"use client";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import { useCrypto } from "@/lib/crypto/CryptoProvider";
import { useSession } from "next-auth/react";

interface PersonaDesignada {
  id: string;
  nombre: string;
  rol: string;
  idiomas: string[];
  disponible: boolean;
  avatar_url: string | null;
  biografia_corta?: string;
  horario?: string;
  modalidades?: string[];
}

interface Cita {
  id: string;
  persona_designada_id: string;
  modalidad: string;
  fecha_propuesta: string;
  estado: "pendiente" | "confirmada" | "cancelada" | "completada";
  enlace_videollamada: string | null;
}

type Vista = "directorio" | "mensajes" | "citas";
type ModalCita = { persona: PersonaDesignada } | null;

const MODALIDAD_ICON: Record<string, string> = {
  presencial: "🏢",
  telefonica: "📞",
  videollamada: "💻",
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente:   "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  confirmada:  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelada:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  completada:  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function ContactoPage() {
  const { data: session } = useSession();
  const { encrypt } = useCrypto();
  const [vista, setVista] = useState<Vista>("directorio");
  const [modalCita, setModalCita] = useState<ModalCita>(null);
  const [citaForm, setCitaForm] = useState({
    modalidad: "presencial",
    fecha_propuesta: "",
    motivo: "",
  });

  // ── Personas designadas ──────────────────────────────────────────────────
  const { data: personas, isLoading: loadingPersonas } = useApiQuery(
    ["personas-designadas"],
    () => apiClient.get<PersonaDesignada[]>("/api/v1/contacto/personas-designadas").then((r) => r.data),
    { enabled: vista === "directorio" }
  );

  // ── Mis citas ────────────────────────────────────────────────────────────
  const { data: citas, isLoading: loadingCitas, refetch: refetchCitas } = useApiQuery(
    ["mis-citas"],
    () => apiClient.get<Cita[]>("/api/v1/contacto/citas").then((r) => r.data),
    { enabled: vista === "citas" }
  );

  // ── Solicitar cita ───────────────────────────────────────────────────────
  const citaMutation = useApiMutation(
    async (persona: PersonaDesignada) => {
      const { ciphertext_b64, iv_b64 } = await encrypt(citaForm.motivo || "Sin motivo especificado");
      return apiClient.post("/api/v1/contacto/citas", {
        persona_designada_id: persona.id,
        modalidad: citaForm.modalidad,
        fecha_propuesta: new Date(citaForm.fecha_propuesta).toISOString(),
        motivo_ciphertext: ciphertext_b64,
        motivo_iv_b64: iv_b64,
      }).then((r) => r.data);
    },
    {
      onSuccess: () => {
        setModalCita(null);
        setCitaForm({ modalidad: "presencial", fecha_propuesta: "", motivo: "" });
        refetchCitas();
        setVista("citas");
      },
    }
  );

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header + pestañas */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Línea de contacto</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Contacta con el equipo de apoyo de tu empresa de forma confidencial
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["directorio", "mensajes", "citas"] as Vista[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors min-h-[44px] ${
              vista === v
                ? "border-brand-600 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            aria-current={vista === v ? "page" : undefined}
          >
            {v === "directorio" ? "Personas designadas" : v === "mensajes" ? "Mensajes" : "Mis citas"}
          </button>
        ))}
      </div>

      {/* ── DIRECTORIO ─────────────────────────────────────────────────── */}
      {vista === "directorio" && (
        <>
          {loadingPersonas && (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}
          {personas && (
            <div className="grid sm:grid-cols-2 gap-4">
              {personas.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        aria-hidden="true"
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-xl font-bold text-brand-700 dark:text-brand-300 shrink-0"
                        aria-hidden="true"
                      >
                        {p.nombre.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.rol}</p>
                      <span
                        className={`inline-flex items-center gap-1 text-xs mt-1 ${
                          p.disponible ? "text-green-600 dark:text-green-400" : "text-gray-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.disponible ? "bg-green-500" : "bg-gray-400"}`} aria-hidden="true" />
                        {p.disponible ? "Disponible" : "No disponible"}
                      </span>
                    </div>
                  </div>

                  {p.biografia_corta && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{p.biografia_corta}</p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {p.idiomas.map((lang) => (
                      <span key={lang} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {lang}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalCita({ persona: p })}
                      disabled={!p.disponible}
                      className="flex-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg py-2 min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Solicitar cita
                    </button>
                    <button
                      type="button"
                      onClick={() => setVista("mensajes")}
                      className="flex-1 text-xs font-medium text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950 rounded-lg py-2 min-h-[36px] transition-colors"
                    >
                      Enviar mensaje
                    </button>
                  </div>
                </div>
              ))}
              {personas.length === 0 && (
                <p className="text-sm text-gray-400 col-span-2 text-center py-8">
                  No hay personas designadas activas en tu empresa.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MENSAJES (stub — chat completo en F8 avanzado) ─────────────── */}
      {vista === "mensajes" && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center space-y-2">
          <p className="text-2xl" aria-hidden="true">💬</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mensajería cifrada E2E
          </p>
          <p className="text-xs text-gray-400">
            Selecciona una persona designada del directorio para iniciar una conversación.
            Los mensajes se cifran en tu dispositivo antes de enviarse.
          </p>
        </div>
      )}

      {/* ── CITAS ───────────────────────────────────────────────────────── */}
      {vista === "citas" && (
        <>
          {loadingCitas && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}
          {citas && (
            <div className="space-y-3">
              {citas.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4"
                >
                  <span className="text-2xl" aria-hidden="true">{MODALIDAD_ICON[c.modalidad] ?? "📅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      Cita {c.modalidad}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(c.fecha_propuesta).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[c.estado]}`}>
                    {c.estado}
                  </span>
                  {c.estado === "confirmada" && c.enlace_videollamada && (
                    <a
                      href={c.enlace_videollamada}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Unirse
                    </a>
                  )}
                </div>
              ))}
              {citas.length === 0 && (
                <div className="text-center py-10 text-sm text-gray-400">
                  No tienes citas programadas.{" "}
                  <button
                    type="button"
                    onClick={() => setVista("directorio")}
                    className="text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Ver personas designadas
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL SOLICITAR CITA ──────────────────────────────────────── */}
      {modalCita && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-cita-title"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-5">
            <h2 id="modal-cita-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Solicitar cita con {modalCita.persona.nombre}
            </h2>

            <div className="space-y-4">
              {/* Modalidad */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modalidad</p>
                <div className="flex gap-2">
                  {["presencial", "telefonica", "videollamada"].map((m) => (
                    <label
                      key={m}
                      className={`flex-1 text-center cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors ${
                        citaForm.modalidad === m
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <input
                        type="radio"
                        value={m}
                        checked={citaForm.modalidad === m}
                        onChange={(e) => setCitaForm((f) => ({ ...f, modalidad: e.target.value }))}
                        className="sr-only"
                      />
                      {MODALIDAD_ICON[m]} {m}
                    </label>
                  ))}
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label htmlFor="fecha-cita" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha y hora propuesta
                </label>
                <input
                  id="fecha-cita"
                  type="datetime-local"
                  value={citaForm.fecha_propuesta}
                  onChange={(e) => setCitaForm((f) => ({ ...f, fecha_propuesta: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Motivo */}
              <div>
                <label htmlFor="motivo-cita" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo <span className="text-gray-400 font-normal">(cifrado — opcional)</span>
                </label>
                <textarea
                  id="motivo-cita"
                  value={citaForm.motivo}
                  onChange={(e) => setCitaForm((f) => ({ ...f, motivo: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  placeholder="Breve descripción del motivo (se cifra en tu dispositivo)"
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>

            {citaMutation.isError && (
              <p role="alert" className="text-xs text-red-600">Error al solicitar la cita. Inténtalo de nuevo.</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setModalCita(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => citaMutation.mutate(modalCita.persona)}
                disabled={!citaForm.fecha_propuesta || citaMutation.isPending}
                className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {citaMutation.isPending ? "Enviando…" : "Solicitar cita"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
