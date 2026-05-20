"use client";
import { useState } from "react";
import { useApiQuery } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import { useCrypto } from "@/lib/crypto/CryptoProvider";

interface ConversacionResumen {
  interlocutor_id: string;
  interlocutor_nombre: string;
  ultimo_mensaje_at: string;
  no_leidos: number;
}

interface Mensaje {
  id: string;
  remitente_id: string;
  destinatario_id: string;
  ciphertext_b64: string;
  iv_b64: string;
  leido: boolean;
  created_at: string;
}

export default function MensajeriaPage() {
  const { decrypt } = useCrypto();
  const [seleccionado, setSeleccionado] = useState<ConversacionResumen | null>(null);
  const [textoDescifrado, setTextoDescifrado] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const { encrypt } = useCrypto();

  const { data: conversaciones, isLoading } = useApiQuery(
    ["conversaciones"],
    () => apiClient.get<ConversacionResumen[]>("/api/v1/contacto/mensajes/conversaciones").then((r) => r.data)
  );

  const { data: mensajes, refetch: refetchMensajes } = useApiQuery(
    ["mensajes", seleccionado?.interlocutor_id],
    () =>
      apiClient
        .get<Mensaje[]>(`/api/v1/contacto/mensajes/con/${seleccionado!.interlocutor_id}`)
        .then((r) => r.data),
    { enabled: !!seleccionado }
  );

  const descifrarMensaje = async (msg: Mensaje) => {
    if (textoDescifrado[msg.id]) return;
    try {
      const texto = await decrypt(msg.ciphertext_b64, msg.iv_b64);
      setTextoDescifrado((prev) => ({ ...prev, [msg.id]: texto }));
    } catch {
      setTextoDescifrado((prev) => ({ ...prev, [msg.id]: "[No se pudo descifrar]" }));
    }
  };

  const enviarRespuesta = async () => {
    if (!input.trim() || !seleccionado) return;
    const { ciphertext_b64, iv_b64 } = await encrypt(input.trim());
    await apiClient.post("/api/v1/contacto/mensajes", {
      destinatario_id: seleccionado.interlocutor_id,
      ciphertext_b64,
      iv_b64,
    });
    setInput("");
    refetchMensajes();
  };

  return (
    <main id="main-content" className="flex h-[calc(100vh-4rem)] max-w-5xl mx-auto gap-0 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Panel izquierdo — lista de conversaciones */}
      <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h1 className="font-semibold text-gray-900 dark:text-white text-sm">Mensajería</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}
          {conversaciones?.map((c) => (
            <button
              key={c.interlocutor_id}
              type="button"
              onClick={() => setSeleccionado(c)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700 ${
                seleccionado?.interlocutor_id === c.interlocutor_id
                  ? "bg-brand-50 dark:bg-brand-950"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {c.interlocutor_nombre}
                </span>
                {c.no_leidos > 0 && (
                  <span className="ml-2 shrink-0 text-xs font-bold text-white bg-brand-600 rounded-full w-5 h-5 flex items-center justify-center">
                    {c.no_leidos}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(c.ultimo_mensaje_at).toLocaleDateString("es-ES")}
              </p>
            </button>
          ))}
          {conversaciones?.length === 0 && (
            <p className="text-xs text-gray-400 p-4 text-center">Sin conversaciones</p>
          )}
        </div>
      </div>

      {/* Panel derecho — hilo de mensajes */}
      <div className="flex-1 flex flex-col min-w-0">
        {!seleccionado ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Selecciona una conversación
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-sm font-bold text-brand-700 dark:text-brand-300" aria-hidden="true">
                {seleccionado.interlocutor_nombre.charAt(0)}
              </div>
              <span className="font-medium text-sm text-gray-900 dark:text-white">
                {seleccionado.interlocutor_nombre}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
              {mensajes?.map((msg) => (
                <div key={msg.id} className="group">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm">
                      {textoDescifrado[msg.id] ? (
                        <p className="text-gray-900 dark:text-white">{textoDescifrado[msg.id]}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => descifrarMensaje(msg)}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          🔒 Descifrar mensaje
                        </button>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(msg.created_at).toLocaleString("es-ES")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {mensajes?.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">
                  No hay mensajes en esta conversación
                </p>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarRespuesta(); } }}
                placeholder="Escribe una respuesta... (cifrada automáticamente)"
                rows={2}
                maxLength={4000}
                className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Mensaje de respuesta"
              />
              <button
                type="button"
                onClick={enviarRespuesta}
                disabled={!input.trim()}
                className="px-3 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl min-h-[44px] disabled:opacity-50 transition-colors"
              >
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
