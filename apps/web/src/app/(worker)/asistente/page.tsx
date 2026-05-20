"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api/client";

interface Mensaje {
  role: "user" | "assistant";
  contenido: string;
  crisis?: boolean;
  pii?: string[];
}

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? "http://localhost:8001";

const RECURSOS = [
  { label: "024 — Crisis emocional", href: "tel:024", desc: "Línea gratuita 24h" },
  { label: "112 — Emergencias", href: "tel:112", desc: "" },
  { label: "016 — Violencia de género", href: "tel:016", desc: "No aparece en factura" },
  { label: "Inspección de Trabajo", href: "https://www.mites.gob.es/itss/web/Trabajadores/Denuncias/", desc: "Denuncia ante la ITSS" },
];

export default function AsistentePage() {
  const { data: session } = useSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingText, setPendingText] = useState("");
  const [initError, setInitError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Crear sesión al montar
  useEffect(() => {
    if (!session?.user) return;
    const token = (session.user as any).accessToken;
    apiClient.post(
      `${AI_ENGINE_URL}/chat/session`,
      { modo: "orientacion" },
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => {
        setSessionId(r.data.session_id);
        setMensajes([{ role: "assistant", contenido: r.data.mensaje_bienvenida }]);
      })
      .catch(() => setInitError(true));
  }, [session]);

  // Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, pendingText]);

  const enviar = async () => {
    if (!input.trim() || !sessionId || streaming) return;
    const texto = input.trim();
    setInput("");
    setMensajes((prev) => [...prev, { role: "user", contenido: texto }]);
    setStreaming(true);
    setPendingText("");

    const token = (session?.user as any)?.accessToken;

    try {
      const res = await fetch(`${AI_ENGINE_URL}/chat/${sessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contenido: texto }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let crisis = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.crisis) crisis = true;
            if (data.text) {
              full += data.text;
              setPendingText(full);
            }
            if (data.done) {
              setMensajes((prev) => [
                ...prev,
                { role: "assistant", contenido: full, crisis },
              ]);
              setPendingText("");
            }
          } catch {
            // chunk parcial, continúa
          }
        }
      }
    } catch {
      setMensajes((prev) => [
        ...prev,
        { role: "assistant", contenido: "Ha ocurrido un error. Por favor intenta de nuevo." },
      ]);
      setPendingText("");
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const borrarConversacion = async () => {
    if (!sessionId) return;
    const token = (session?.user as any)?.accessToken;
    await fetch(`${AI_ENGINE_URL}/chat/${sessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setMensajes([]);
    setSessionId(null);
    setConfirmDelete(false);
    // Crear nueva sesión
    const r = await apiClient.post(
      `${AI_ENGINE_URL}/chat/session`,
      { modo: "orientacion" },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setSessionId(r.data.session_id);
    setMensajes([{ role: "assistant", contenido: r.data.mensaje_bienvenida }]);
  };

  if (initError) {
    return (
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No se pudo conectar con el asistente. Inténtalo más tarde.
        </p>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex h-[calc(100vh-4rem)] max-w-5xl mx-auto gap-4 px-4 py-4">
      {/* Panel principal de chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-3">
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">Asistente SafeWork</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Orientación confidencial — no es psicólogo ni abogado
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors min-h-[36px] px-2"
            aria-label="Borrar conversación"
          >
            Borrar conversación
          </button>
        </div>

        {/* Modal confirmación borrado */}
        {confirmDelete && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">
              <h2 id="confirm-title" className="font-semibold text-gray-900 dark:text-white">
                ¿Borrar toda la conversación?
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Esta acción es irreversible. Se eliminarán todos los mensajes de la sesión actual.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={borrarConversacion}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg min-h-[44px]"
                >
                  Sí, borrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mensajes */}
        <div
          className="flex-1 overflow-y-auto space-y-4 pr-1"
          aria-live="polite"
          aria-label="Conversación con el asistente"
        >
          {mensajes.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white rounded-br-sm"
                    : msg.crisis
                    ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100 rounded-bl-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm"
                }`}
              >
                {msg.crisis && (
                  <p className="font-semibold text-red-700 dark:text-red-300 mb-2 text-xs uppercase tracking-wide">
                    ⚠ Recursos de ayuda urgente
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.contenido}</p>
                {msg.pii && msg.pii.length > 0 && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 rounded px-2 py-1">
                    Aviso: se detectó posible {msg.pii.join(", ")} en tu mensaje.
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Texto en streaming */}
          {pendingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
                <p className="whitespace-pre-wrap">{pendingText}</p>
                <span className="inline-block w-1.5 h-4 bg-brand-500 animate-pulse ml-0.5 align-middle" aria-hidden="true" />
              </div>
            </div>
          )}

          {streaming && !pendingText && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-gray-100 dark:bg-gray-800">
                <span className="flex gap-1" aria-label="El asistente está escribiendo">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Botones de acción rápida */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {[
            { label: "Iniciar denuncia", href: "/denuncia" },
            { label: "Hablar con persona designada", href: "/contacto" },
          ].map((btn) => (
            <a
              key={btn.label}
              href={btn.href}
              className="text-xs px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors min-h-[36px] flex items-center"
            >
              {btn.label}
            </a>
          ))}
        </div>

        {/* Input */}
        <form
          className="mt-3 flex gap-2 items-end"
          onSubmit={(e) => { e.preventDefault(); enviar(); }}
        >
          <label htmlFor="chat-input" className="sr-only">Escribe tu mensaje</label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
            }}
            placeholder="Escribe aquí... (Intro para enviar, Mayús+Intro para nueva línea)"
            rows={2}
            maxLength={4000}
            disabled={streaming || !sessionId}
            className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
            aria-label="Mensaje para el asistente"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim() || !sessionId}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl min-h-[44px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Enviar mensaje"
          >
            Enviar
          </button>
        </form>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
          No incluyas datos personales (DNI, teléfono, email). Conversación cifrada y con retención limitada.
        </p>
      </div>

      {/* Panel lateral — recursos */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 gap-3" aria-label="Recursos de ayuda">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Recursos de ayuda
          </h2>
          {RECURSOS.map((r) => (
            <a
              key={r.label}
              href={r.href}
              target={r.href.startsWith("http") ? "_blank" : undefined}
              rel={r.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="block text-sm text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              <span className="font-medium">{r.label}</span>
              {r.desc && <span className="block text-xs text-gray-400">{r.desc}</span>}
            </a>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <p className="font-medium text-gray-500 dark:text-gray-400">Aviso legal</p>
          <p>El asistente no es psicólogo ni abogado. Para asesoría profesional consulta con el servicio de prevención o un abogado laboralista.</p>
        </div>
      </aside>
    </main>
  );
}
