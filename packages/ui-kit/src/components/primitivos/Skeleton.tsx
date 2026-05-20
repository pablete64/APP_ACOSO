import * as React from "react";
import { cn } from "../../lib/utils.ts";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Forma del skeleton */
  shape?: "rectangle" | "circle" | "text";
}

function Skeleton({ className, shape = "rectangle", ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Cargando..."
      className={cn(
        "animate-pulse bg-muted",
        shape === "circle"    && "rounded-full",
        shape === "rectangle" && "rounded-md",
        shape === "text"      && "h-4 rounded",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
