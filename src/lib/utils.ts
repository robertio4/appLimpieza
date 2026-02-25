import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { EstadoFactura, EstadoPresupuesto, EstadoTrabajo } from "@/types/database";

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
  borrador: "text-slate-900 border border-slate-400 shadow-sm",
  enviada: "text-blue-900 border border-blue-400 shadow-sm",
  pagada: "text-green-900 border border-green-400 shadow-sm",
};

/**
 * Invoice status background colors
 */
export const estadoBadgeColors: Record<EstadoFactura, string> = {
  borrador: "#D1D5DB",  // Gris
  enviada: "#93C5FD",   // Azul claro
  pagada: "#86EFAC",    // Verde claro
};

/**
 * Invoice status labels in Spanish
 */
export const estadoLabels: Record<EstadoFactura, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  pagada: "Pagada",
};

/**
 * Presupuesto status badge styles
 */
export const estadoPresupuestoBadgeStyles: Record<EstadoPresupuesto, string> = {
  pendiente: "text-orange-900 border border-orange-400 shadow-sm",
  aceptado: "text-green-900 border border-green-400 shadow-sm",
  rechazado: "text-red-900 border border-red-400 shadow-sm",
  expirado: "text-slate-900 border border-slate-400 shadow-sm",
};

/**
 * Presupuesto status background colors
 */
export const estadoPresupuestoBadgeColors: Record<EstadoPresupuesto, string> = {
  pendiente: "#FDB462",  // Naranja
  aceptado: "#86EFAC",   // Verde claro
  rechazado: "#FCA5A5",  // Rojo claro
  expirado: "#CBD5E1",   // Gris azulado
};

/**
 * Presupuesto status labels in Spanish
 */
export const estadoPresupuestoLabels: Record<EstadoPresupuesto, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  expirado: "Expirado",
};

/**
 * Check if a presupuesto has expired based on fecha_validez
 */
export function isPresupuestoExpired(fechaValidez: string): boolean {
  return new Date(fechaValidez) < new Date();
}

/**
 * Trabajo status badge styles
 */
export const estadoTrabajoBadgeStyles: Record<EstadoTrabajo, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  en_progreso: "bg-blue-100 text-blue-700",
  completado: "bg-green-100 text-green-700",
  cancelado: "bg-neutral-100 text-neutral-700",
};

/**
 * Trabajo status labels in Spanish
 */
export const estadoTrabajoLabels: Record<EstadoTrabajo, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  cancelado: "Cancelado",
};
