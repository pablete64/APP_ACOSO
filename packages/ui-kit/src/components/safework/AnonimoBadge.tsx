import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export interface AnonimoBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Muestra el icono de escudo */
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-2.5 py-1 gap-1.5",
  lg: "text-base px-3 py-1.5 gap-2",
};

const iconSizes = { sm: 12, md: 14, lg: 16 };

function AnonimoBadge({
  className,
  showIcon = true,
  size = "md",
  ...props
}: AnonimoBadgeProps) {
  return (
    <span
      role="img"
      aria-label="Contenido anónimo — sin metadatos identificativos"
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        "bg-trust-100 text-trust-800 border border-trust-200",
        "dark:bg-trust-900/30 dark:text-trust-300 dark:border-trust-800",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {showIcon && (
        <ShieldCheck
          size={iconSizes[size]}
          aria-hidden="true"
          className="shrink-0"
        />
      )}
      Anónimo
    </span>
  );
}

export { AnonimoBadge };
