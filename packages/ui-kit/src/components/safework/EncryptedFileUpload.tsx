import * as React from "react";
import { Upload, X, ShieldCheck, AlertCircle, File } from "lucide-react";
import { cn } from "../../lib/utils.ts";

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav", "audio/ogg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export interface EncryptedFile {
  /** SHA-256 hex del contenido ORIGINAL (antes de cifrar) */
  sha256Hash: string;
  /** Nombre del archivo original */
  name: string;
  /** MIME type */
  type: string;
  /** Tamaño en bytes (original) */
  size: number;
  /** IV usado para AES-GCM (base64) */
  iv: string;
  /** Ciphertext cifrado (base64) */
  ciphertext: string;
}

export interface EncryptedFileUploadProps {
  /** Clave AES-256 para cifrar los archivos antes de enviarlos */
  encryptionKey: CryptoKey;
  /** Callback con los archivos cifrados listos para enviar */
  onFilesEncrypted: (files: EncryptedFile[]) => void;
  /** Número máximo de archivos (por defecto: 10) */
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

type FileStatus = "pending" | "encrypting" | "ready" | "error";

interface ManagedFile {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
  encrypted?: EncryptedFile;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function encryptFile(
  file: File,
  key: CryptoKey
): Promise<EncryptedFile> {
  const buffer = await file.arrayBuffer();

  // SHA-256 del contenido original
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256Hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // IV aleatorio (12 bytes — AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Cifrado AES-256-GCM
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    buffer
  );

  const toBase64 = (arr: Uint8Array | ArrayBuffer): string =>
    btoa(String.fromCharCode(...new Uint8Array(arr)));

  return {
    sha256Hash,
    name: file.name,
    type: file.type,
    size: file.size,
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertextBuffer),
  };
}

function EncryptedFileUpload({
  encryptionKey,
  onFilesEncrypted,
  maxFiles = 10,
  className,
  disabled = false,
}: EncryptedFileUploadProps) {
  const [files, setFiles] = React.useState<ManagedFile[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const encryptAndAdd = React.useCallback(
    async (newFiles: File[]) => {
      const currentCount = files.filter((f) => f.status !== "error").length;
      const available = maxFiles - currentCount;
      const toProcess = newFiles.slice(0, available);

      const managed: ManagedFile[] = toProcess.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        status: "pending" as const,
        error: undefined,
      }));

      setFiles((prev) => [...prev, ...managed]);

      for (const mf of managed) {
        // Validations
        if (!ALLOWED_MIME_TYPES.includes(mf.file.type)) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === mf.id
                ? { ...f, status: "error", error: "Tipo de archivo no permitido" }
                : f
            )
          );
          continue;
        }
        if (mf.file.size > MAX_FILE_SIZE) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === mf.id
                ? { ...f, status: "error", error: "Tamaño máximo: 50 MB" }
                : f
            )
          );
          continue;
        }

        // Encrypting
        setFiles((prev) =>
          prev.map((f) => (f.id === mf.id ? { ...f, status: "encrypting" } : f))
        );

        try {
          const encrypted = await encryptFile(mf.file, encryptionKey);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === mf.id ? { ...f, status: "ready", encrypted } : f
            )
          );
        } catch {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === mf.id
                ? { ...f, status: "error", error: "Error al cifrar el archivo" }
                : f
            )
          );
        }
      }
    },
    [files, maxFiles, encryptionKey]
  );

  // Notify parent when all ready files change
  React.useEffect(() => {
    const ready = files
      .filter((f) => f.status === "ready" && f.encrypted)
      .map((f) => f.encrypted!);
    onFilesEncrypted(ready);
  }, [files, onFilesEncrypted]);

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    encryptAndAdd(Array.from(e.dataTransfer.files));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      encryptAndAdd(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const isFull = files.filter((f) => f.status !== "error").length >= maxFiles;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={disabled || isFull ? -1 : 0}
        aria-label="Zona de carga de archivos. Arrastra archivos o pulsa para seleccionar"
        aria-disabled={disabled || isFull}
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !isFull) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !isFull && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !isFull) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2",
          "rounded-xl border-2 border-dashed transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          dragging
            ? "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950"
            : "border-muted-foreground/30 bg-muted/30 hover:border-brand-300 hover:bg-brand-50/50",
          (disabled || isFull) && "pointer-events-none opacity-50"
        )}
      >
        <Upload size={24} className="text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          {isFull
            ? `Límite alcanzado (${maxFiles} archivos)`
            : "Arrastra archivos o haz clic para seleccionar"}
        </p>
        <p className="text-xs text-muted-foreground/70">
          Máx. {maxFiles} archivos · 50 MB cada uno
        </p>

        {/* Encrypted shield indicator */}
        <span className="absolute bottom-2 right-3 flex items-center gap-1 text-xs text-trust-600 dark:text-trust-400">
          <ShieldCheck size={12} aria-hidden="true" />
          Cifrado antes de enviar
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_MIME_TYPES.join(",")}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleInputChange}
        disabled={disabled || isFull}
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Archivos adjuntos">
          {files.map((mf) => (
            <li
              key={mf.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                mf.status === "error"
                  ? "border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-950/30"
                  : mf.status === "ready"
                  ? "border-trust-200 bg-trust-50 dark:border-trust-800 dark:bg-trust-950/30"
                  : "border-border bg-muted/30"
              )}
            >
              {mf.status === "error" ? (
                <AlertCircle size={16} className="shrink-0 text-danger-600" aria-hidden="true" />
              ) : mf.status === "ready" ? (
                <ShieldCheck size={16} className="shrink-0 text-trust-600" aria-hidden="true" />
              ) : (
                <File size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              )}

              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate font-medium">{mf.file.name}</span>
                {mf.status === "error" ? (
                  <span className="text-xs text-danger-600">{mf.error}</span>
                ) : mf.status === "encrypting" ? (
                  <span className="text-xs text-muted-foreground">Cifrando…</span>
                ) : mf.status === "ready" ? (
                  <span className="text-xs text-trust-700 dark:text-trust-400">
                    Cifrado · {formatBytes(mf.file.size)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{formatBytes(mf.file.size)}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeFile(mf.id)}
                aria-label={`Eliminar ${mf.file.name}`}
                className={cn(
                  "flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md",
                  "text-muted-foreground transition-colors hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { EncryptedFileUpload };
