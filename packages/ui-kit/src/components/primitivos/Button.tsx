import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.ts";

const buttonVariants = cva(
  // Base: táctil (min 44px), foco visible, transición suave
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "min-h-tap",  // 44px — target táctil mínimo (WCAG 2.5.5)
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        // --- Variantes principales ---
        default:    "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:"bg-danger-500 text-white shadow-sm hover:bg-danger-600",
        outline:    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:  "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost:      "hover:bg-accent hover:text-accent-foreground",
        link:       "text-primary underline-offset-4 hover:underline",
        // --- Variantes SafeWork AI ---
        trust:      "bg-trust-500 text-white shadow-sm hover:bg-trust-600 focus-visible:ring-trust-500",
        alert:      "bg-alert-500 text-white shadow-sm hover:bg-alert-600 focus-visible:ring-alert-500",
      },
      size: {
        default: "h-11 px-4 py-2",         // 44px = tap target mínimo
        sm:      "h-9 rounded-md px-3",
        lg:      "h-12 rounded-md px-8 text-base",
        icon:    "h-11 w-11",
        "icon-sm":"h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renderiza el componente como hijo (Radix Slot) en lugar de un <button> */
  asChild?: boolean;
  /** Muestra spinner de carga y desactiva el botón */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled ?? loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 size-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
