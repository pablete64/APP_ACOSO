import * as React from "react";
import { Scale, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export type LegalNoticeVariant = "info" | "warning" | "compact";

export interface LegalNoticeProps {
  variant?: LegalNoticeVariant;
  /** Oculta el botón de cerrar (útil en formularios obligatorios) */
  dismissible?: boolean;
  /** Callback al cerrar el aviso */
  onDismiss?: () => void;
  /** Permite expandir/colapsar el texto largo */
  expandable?: boolean;
  className?: string;
}

const LEGAL_TITLE = "Aviso legal — Ley 2/2023 y LOPD";

const LEGAL_FULL = `Este sistema de denuncia está regulado por la Ley 2/2023, de 20 de febrero, reguladora de la protección de las personas que informen sobre infracciones normativas y de lucha contra la corrupción (transposición de la Directiva UE 2019/1937).

Todos los datos proporcionados se tratan de conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD). Las comunicaciones se cifran extremo a extremo. La empresa no puede identificar al denunciante en denuncias anónimas, ni acceder a los mensajes sin el consentimiento expreso del titular.

El acceso no autorizado o la represalia contra el denunciante constituye infracción grave tipificada en el artículo 36 de la Ley 2/2023.`;

const LEGAL_SHORT = `Regulado por la Ley 2/2023 · RGPD · LOPDGDD. Tus datos están cifrados. El anonimato está garantizado.`;

function LegalNotice({
  variant = "info",
  dismissible = false,
  onDismiss,
  expandable = false,
  className,
}: LegalNoticeProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  if (variant === "compact") {
    return (
      <p
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          className
        )}
      >
        <Scale size={12} aria-hidden="true" className="shrink-0" />
        {LEGAL_SHORT}
      </p>
    );
  }

  return (
    <aside
      role="note"
      aria-label={LEGAL_TITLE}
      className={cn(
        "relative rounded-xl border p-4 text-sm",
        variant === "warning"
          ? "border-alert-200 bg-alert-50 text-alert-900 dark:border-alert-800 dark:bg-alert-950/40 dark:text-alert-200"
          : "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-200",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <Scale
          size={16}
          aria-hidden="true"
          className={cn(
            "mt-0.5 shrink-0",
            variant === "warning" ? "text-alert-600 dark:text-alert-400" : "text-brand-600 dark:text-brand-400"
          )}
        />
        <div className="flex-1">
          <p className="font-semibold">{LEGAL_TITLE}</p>

          {expandable ? (
            <>
              <p className="mt-1 text-xs leading-relaxed opacity-80">
                {expanded ? LEGAL_FULL : LEGAL_SHORT}
              </p>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className={cn(
                  "mt-2 flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  variant === "warning"
                    ? "text-alert-700 focus-visible:ring-alert-500 dark:text-alert-400"
                    : "text-brand-700 focus-visible:ring-brand-500 dark:text-brand-400"
                )}
              >
                {expanded ? (
                  <>
                    <ChevronUp size={12} aria-hidden="true" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} aria-hidden="true" />
                    Leer más
                  </>
                )}
              </button>
            </>
          ) : (
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              {LEGAL_FULL}
            </p>
          )}
        </div>

        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar aviso legal"
            className={cn(
              "flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md",
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              variant === "warning"
                ? "text-alert-600 hover:bg-alert-100 focus-visible:ring-alert-500 dark:text-alert-400 dark:hover:bg-alert-900/30"
                : "text-brand-600 hover:bg-brand-100 focus-visible:ring-brand-500 dark:text-brand-400 dark:hover:bg-brand-900/30"
            )}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
}

export { LegalNotice };
