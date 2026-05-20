import * as React from "react";
import { Copy, CheckCheck } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export interface TrackingCodeDisplayProps {
  /** Código de seguimiento (formato: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX — 10 chars base32) */
  code: string;
  className?: string;
}

function TrackingCodeDisplay({ code, className }: TrackingCodeDisplayProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    if (copied) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard not available — silently fail
    }
  }, [code, copied]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCopy();
    }
  };

  // Format as groups of 4 for readability: XXXX-XXXX-XX
  const formatted = code.match(/.{1,4}/g)?.join("-") ?? code;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50 p-4",
        "dark:border-brand-800 dark:bg-brand-950",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
        Código de seguimiento
      </p>

      <div className="flex items-center gap-3">
        <code
          className={cn(
            "flex-1 font-mono text-lg font-bold tracking-widest select-all",
            "text-brand-900 dark:text-brand-100"
          )}
          aria-label={`Código de seguimiento: ${code}`}
        >
          {formatted}
        </code>

        <button
          type="button"
          onClick={handleCopy}
          onKeyDown={handleKeyDown}
          disabled={copied}
          aria-label={copied ? "Código copiado" : "Copiar código de seguimiento"}
          className={cn(
            "flex min-h-tap min-w-tap items-center justify-center rounded-lg",
            "border transition-colors duration-150 focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
            copied
              ? "border-trust-300 bg-trust-50 text-trust-700 dark:border-trust-700 dark:bg-trust-900/20 dark:text-trust-400"
              : "border-brand-200 bg-white text-brand-600 hover:bg-brand-100 dark:border-brand-700 dark:bg-transparent dark:text-brand-400 dark:hover:bg-brand-900/30"
          )}
        >
          {copied ? (
            <CheckCheck size={18} aria-hidden="true" />
          ) : (
            <Copy size={18} aria-hidden="true" />
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Guarda este código — es la única forma de acceder a tu denuncia.
      </p>

      {copied && (
        <p
          role="status"
          aria-live="polite"
          className="text-xs font-medium text-trust-700 dark:text-trust-400"
        >
          Código copiado al portapapeles
        </p>
      )}
    </div>
  );
}

export { TrackingCodeDisplay };
