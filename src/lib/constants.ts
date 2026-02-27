/**
 * Company data configuration for invoices
 */
export const DATOS_EMPRESA = {
  nombre: "Limpiezas Roferlim",
  direccion: "Rua da Fraga, 2 - 1º Dcha, 27003 Lugo",
  nif: "33861402C",
  telefono: "600 418 963",
  email: "roferlimpiezas@gmail.com",
  iban: "ES67 3070 0020 2315 6082 1819",
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
