import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases Tailwind sin conflictos. Usar en todos los componentes del ui-kit. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
