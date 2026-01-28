import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { EstadoFactura } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency in euros (€)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Formats a date string to Spanish locale (dd/mm/yyyy)
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Invoice status badge styles
 */
export const estadoBadgeStyles: Record<EstadoFactura, string> = {
  borrador: "bg-neutral-100 text-neutral-700",
  enviada: "bg-blue-100 text-blue-700",
  pagada: "bg-green-100 text-green-700",
};

/**
 * Invoice status labels in Spanish
 */
export const estadoLabels: Record<EstadoFactura, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  pagada: "Pagada",
};
