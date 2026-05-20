import * as React from "react";
import { cn } from "../../lib/utils.ts";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  errorId?: string;
  /** Muestra contador de caracteres cuando se define maxLength */
  showCount?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, errorId, id, showCount = false, maxLength, value, onChange, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId  = id ?? generatedId;
    const descId   = errorId ?? `${inputId}-error`;
    const hasError = Boolean(error);

    const [charCount, setCharCount] = React.useState(
      typeof value === "string" ? value.length : 0
    );

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      setCharCount(e.target.value.length);
      onChange?.(e);
    }

    return (
      <div className="w-full">
        <textarea
          id={inputId}
          ref={ref}
          maxLength={maxLength}
          value={value}
          onChange={showCount ? handleChange : onChange}
          aria-invalid={hasError}
          aria-describedby={hasError ? descId : undefined}
          className={cn(
            "flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "resize-y transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError
              ? "border-danger-500 focus-visible:ring-danger-500"
              : "border-input hover:border-muted-foreground",
            className
          )}
          {...props}
        />
        <div className="mt-1.5 flex items-start justify-between gap-2">
          {hasError && (
            <p id={descId} role="alert" className="text-xs text-danger-500">
              {error}
            </p>
          )}
          {showCount && maxLength && (
            <p
              className={cn(
                "ml-auto text-xs tabular-nums",
                charCount >= maxLength ? "text-danger-500" : "text-muted-foreground"
              )}
              aria-live="polite"
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
