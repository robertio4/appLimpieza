/**
 * Company data configuration for invoices.
 * Values are read from NEXT_PUBLIC_COMPANY_* environment variables so that
 * sensitive data (NIF, IBAN) is never stored in the git repository.
 *
 * Required .env.local / production env vars:
 *   NEXT_PUBLIC_COMPANY_NOMBRE
 *   NEXT_PUBLIC_COMPANY_DIRECCION
 *   NEXT_PUBLIC_COMPANY_NIF
 *   NEXT_PUBLIC_COMPANY_TELEFONO
 *   NEXT_PUBLIC_COMPANY_EMAIL
 *   NEXT_PUBLIC_COMPANY_IBAN
 */
export const DATOS_EMPRESA = {
  nombre: process.env.NEXT_PUBLIC_COMPANY_NOMBRE ?? "Mi Empresa",
  direccion: process.env.NEXT_PUBLIC_COMPANY_DIRECCION ?? "",
  nif: process.env.NEXT_PUBLIC_COMPANY_NIF ?? "",
  telefono: process.env.NEXT_PUBLIC_COMPANY_TELEFONO ?? "",
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? "",
  iban: process.env.NEXT_PUBLIC_COMPANY_IBAN ?? "",
};

/**
 * IVA percentage for invoices (as decimal, e.g., 0.21 = 21%)
 */
export const IVA_RATE = 0.21;

/**
 * IVA percentage for display (as integer, e.g., 21)
 */
export const IVA_PERCENTAGE = 21;

/**
 * Default validity period for presupuestos (in days)
 */
export const PRESUPUESTO_VALIDITY_DAYS = 30;

/**
 * Presupuesto status values
 */
export const ESTADOS_PRESUPUESTO = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  expirado: "Expirado",
} as const;

/**
 * Service type labels for trabajos (cleaning jobs)
 */
export const TIPOS_SERVICIO = {
  limpieza_general: "Limpieza General",
  limpieza_profunda: "Limpieza Profunda",
  limpieza_oficina: "Limpieza de Oficina",
  limpieza_cristales: "Limpieza de Cristales",
  otros: "Otros",
} as const;

/**
 * Trabajo status labels
 */
export const ESTADOS_TRABAJO = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  cancelado: "Cancelado",
} as const;

/**
 * Color codes for service types (for calendar display)
 */
export const TIPO_SERVICIO_COLORS = {
  limpieza_general: "#3B82F6", // Blue
  limpieza_profunda: "#8B5CF6", // Purple
  limpieza_oficina: "#10B981", // Green
  limpieza_cristales: "#F59E0B", // Amber
  otros: "#6B7280", // Gray
} as const;

/**
 * Month names in Spanish
 */
export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/**
 * Quarter names with month ranges
 */
export const QUARTER_NAMES = [
  "Q1 (Ene-Mar)",
  "Q2 (Abr-Jun)",
  "Q3 (Jul-Sep)",
  "Q4 (Oct-Dic)",
] as const;
