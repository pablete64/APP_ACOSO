import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.ts";

const spinnerVariants = cva("animate-spin text-current", {
  variants: {
    size: {
      sm:  "size-4",
      md:  "size-6",
      lg:  "size-8",
      xl:  "size-12",
    },
  },
  defaultVariants: { size: "md" },
});

export interface SpinnerProps
  extends React.SVGAttributes<SVGElement>,
    VariantProps<typeof spinnerVariants> {
  /** Texto leído por lectores de pantalla (por defecto: "Cargando…") */
  label?: string;
}

function Spinner({ className, size, label = "Cargando…", ...props }: SpinnerProps) {
  return (
    <svg
      role="status"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export { Spinner };
