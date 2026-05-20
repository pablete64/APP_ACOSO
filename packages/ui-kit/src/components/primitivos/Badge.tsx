import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.ts";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-danger-500 text-white",
        outline:     "text-foreground border-border",
        // SafeWork AI
        trust:       "border-transparent bg-trust-100 text-trust-700 dark:bg-trust-900/30 dark:text-trust-400",
        alert:       "border-transparent bg-alert-100 text-alert-700 dark:bg-alert-900/30 dark:text-alert-400",
        danger:      "border-transparent bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400",
        brand:       "border-transparent bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
