import * as React from "react";
import { cn } from "../../lib/utils.ts";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Texto de error — activa estado inválido y añade aria-describedby */
  error?: string;
  /** ID del mensaje de error (generado automáticamente si no se provee) */
  errorId?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, errorId, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId  = id ?? generatedId;
    const descId   = errorId ?? `${inputId}-error`;
    const hasError = Boolean(error);

    return (
      <div className="w-full">
        <input
          id={inputId}
          ref={ref}
          type={type}
          aria-invalid={hasError}
          aria-describedby={hasError ? descId : undefined}
          className={cn(
            // Base
            "flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "transition-colors duration-150",
            // Focus
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            // Disabled
            "disabled:cursor-not-allowed disabled:opacity-50",
            // File inputs
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            // Estado normal vs error
            hasError
              ? "border-danger-500 focus-visible:ring-danger-500"
              : "border-input hover:border-muted-foreground",
            className
          )}
          {...props}
        />
        {hasError && (
          <p
            id={descId}
            role="alert"
            className="mt-1.5 text-xs text-danger-500"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
