"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  createErrorResult,
  createSuccessResult,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";
import type { Cliente, ClienteInsert, ClienteUpdate } from "@/types/database";

export type { ActionResult } from "@/lib/types";

export async function getClientes(): Promise<ActionResult<Cliente[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("user_id", user.id)
      .order("nombre", { ascending: true });

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult((data as Cliente[]) || []);
  } catch {
    return createErrorResult("Error al obtener los clientes");
  }
}

export async function getCliente(id: string): Promise<ActionResult<Cliente>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    if (!data) {
      return createErrorResult("Cliente no encontrado");
    }

    return createSuccessResult(data as Cliente);
  } catch {
    return createErrorResult("Error al obtener el cliente");
  }
}

export async function createCliente(
  clienteData: Omit<ClienteInsert, "user_id">,
): Promise<ActionResult<Cliente>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        ...clienteData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/clientes");
    return createSuccessResult(data as Cliente);
  } catch {
    return createErrorResult("Error al crear el cliente");
  }
}

export async function updateCliente(
  id: string,
  clienteData: Omit<ClienteUpdate, "user_id" | "id">,
): Promise<ActionResult<Cliente>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clientes")
      .update({
        ...clienteData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    if (!data) {
      return createErrorResult("Cliente no encontrado");
    }

    revalidatePath("/clientes");
    return createSuccessResult(data as Cliente);
  } catch {
    return createErrorResult("Error al actualizar el cliente");
  }
}

export async function deleteCliente(id: string): Promise<ActionResult<void>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Check if cliente has any facturas
    const { data: facturas, error: facturasError } = await supabase
      .from("facturas")
      .select("id")
      .eq("cliente_id", id)
      .limit(1);

    if (facturasError) {
      return createErrorResult(facturasError.message);
    }

    if (facturas && facturas.length > 0) {
      return createErrorResult(
        "No se puede eliminar el cliente porque tiene facturas asociadas",
      );
    }

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/clientes");
    return createSuccessResult(undefined);
  } catch {
    return createErrorResult("Error al eliminar el cliente");
  }
}

// ========================================
// FACTURACIÓN RECURRENTE
// ========================================

interface RecurringInvoiceResult {
  generated: Array<{ cliente_nombre: string; factura_numero: string; factura_id: string }>;
  skipped: Array<{ cliente_nombre: string; reason: string }>;
  errors: Array<{ cliente_nombre: string; error: string }>;
}

interface FacturaCompletaConLineas {
  id: string;
  numero: string;
  fecha: string;
  fecha_vencimiento: string | null;
  notas: string | null;
  lineas_factura: Array<{
    concepto: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

/**
 * Calcula la fecha de vencimiento basada en el plazo de la última factura
 */
function calculateDueDate(
  lastInvoiceDate: string,
  lastInvoiceDueDate: string | null,
  newInvoiceDate: string
): string | undefined {
  if (!lastInvoiceDueDate) {
    return undefined;
  }

  // Calcular días de plazo de la última factura
  const lastDate = new Date(lastInvoiceDate);
  const lastDueDate = new Date(lastInvoiceDueDate);
  const daysDiff = Math.round(
    (lastDueDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Aplicar el mismo plazo a la nueva factura
  const newDate = new Date(newInvoiceDate);
  newDate.setDate(newDate.getDate() + daysDiff);

  return newDate.toISOString().split("T")[0];
}

/**
 * Verifica si un cliente ya tiene factura en el mes/año especificado
 */
async function hasInvoiceInMonth(
  clienteId: string,
  userId: string,
  month: number,
  year: number,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // Fechas de inicio y fin del mes
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("facturas")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("user_id", userId)
    .gte("fecha", startDate)
    .lt("fecha", endDate)
    .limit(1);

  if (error) {
    console.error("Error checking invoice in month:", error);
    throw new Error("Error checking existing invoices for client in month");
  }

  return (data && data.length > 0) || false;
}

/**
 * Obtiene la última factura completa de un cliente (con líneas)
 */
async function getLastClientInvoice(
  clienteId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<FacturaCompletaConLineas | null> {
  const { data, error } = await supabase
    .from("facturas")
    .select(
      `
      id,
      numero,
      fecha,
      fecha_vencimiento,
      notas,
      lineas_factura (
        concepto,
        cantidad,
        precio_unitario
      )
    `
    )
    .eq("cliente_id", clienteId)
    .eq("user_id", userId)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error getting last client invoice:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return data as FacturaCompletaConLineas;
}

/**
 * Genera facturas recurrentes para el mes actual
 * Busca clientes con facturación recurrente y crea facturas copiando la última
 */
export async function generateRecurringInvoices(
  targetMonth?: number,
  targetYear?: number
): Promise<ActionResult<RecurringInvoiceResult>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    // Validar mes/año objetivo y usar mes/año actual si no se especifica
    if (
      typeof targetMonth !== "undefined" &&
      (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12)
    ) {
      return createErrorResult("Mes objetivo inválido. Debe estar entre 1 y 12.");
    }

    if (
      typeof targetYear !== "undefined" &&
      (!Number.isInteger(targetYear) || targetYear < 1900 || targetYear > 3000)
    ) {
      return createErrorResult(
        "Año objetivo inválido. Debe ser un número entero entre 1900 y 3000."
      );
    }

    const now = new Date();
    const month = targetMonth ?? now.getMonth() + 1;
    const year = targetYear ?? now.getFullYear();

    const result: RecurringInvoiceResult = {
      generated: [],
      skipped: [],
      errors: [],
    };

    // Obtener clientes con facturación recurrente
    const supabase = await createClient();

    // Importar createFactura una sola vez fuera del bucle para evitar dependencias circulares
    const { createFactura } = await import("@/lib/actions/facturas");

    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nombre, facturacion_recurrente, dia_facturacion")
      .eq("user_id", user.id)
      .eq("facturacion_recurrente", true);

    if (clientesError) {
      return createErrorResult(clientesError.message);
    }

    if (!clientes || clientes.length === 0) {
      return createSuccessResult(result);
    }

    // Procesar cada cliente recurrente
    for (const cliente of clientes) {
      try {
        // Verificar que tenga día de facturación configurado
        if (!cliente.dia_facturacion) {
          result.skipped.push({
            cliente_nombre: cliente.nombre,
            reason: "No tiene día de facturación configurado",
          });
          continue;
        }

        // Verificar si ya existe factura este mes
        const hasInvoice = await hasInvoiceInMonth(
          cliente.id,
          user.id,
          month,
          year,
          supabase
        );

        if (hasInvoice) {
          result.skipped.push({
            cliente_nombre: cliente.nombre,
            reason: "Ya existe factura este mes",
          });
          continue;
        }

        // Obtener última factura del cliente
        const lastInvoice = await getLastClientInvoice(cliente.id, user.id, supabase);

        if (!lastInvoice) {
          result.skipped.push({
            cliente_nombre: cliente.nombre,
            reason: "No tiene factura previa (plantilla)",
          });
          continue;
        }

        if (!lastInvoice.lineas_factura || lastInvoice.lineas_factura.length === 0) {
          result.skipped.push({
            cliente_nombre: cliente.nombre,
            reason: "La última factura no tiene líneas",
          });
          continue;
        }

        // Calcular fecha de la nueva factura usando el mes/año objetivo y el día de facturación del cliente
        // dia_facturacion is guaranteed non-null here due to the guard above
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const billingDay = cliente.dia_facturacion!;
        const effectiveDay = Math.min(billingDay, lastDayOfMonth);
        const monthStr = String(month).padStart(2, "0");
        const dayStr = String(effectiveDay).padStart(2, "0");
        const newInvoiceDate = `${year}-${monthStr}-${dayStr}`;

        // Calcular fecha de vencimiento (mismo plazo que última factura)
        const fechaVencimiento = calculateDueDate(
          lastInvoice.fecha,
          lastInvoice.fecha_vencimiento,
          newInvoiceDate
        );

        // Preparar notas (copiar y agregar referencia)
        let notas = lastInvoice.notas || "";
        if (notas) {
          notas += "\n\n";
        }
        notas += `Generado automáticamente desde factura ${lastInvoice.numero}`;

        const facturaData = {
          cliente_id: cliente.id,
          fecha: newInvoiceDate,
          fecha_vencimiento: fechaVencimiento,
          notas,
          lineas: lastInvoice.lineas_factura.map((linea) => ({
            concepto: linea.concepto,
            cantidad: linea.cantidad,
            precio_unitario: linea.precio_unitario,
          })),
        };

        const facturaResult = await createFactura(facturaData);

        if (facturaResult.success) {
          result.generated.push({
            cliente_nombre: cliente.nombre,
            factura_numero: facturaResult.data.numero,
            factura_id: facturaResult.data.id,
          });
        } else {
          result.errors.push({
            cliente_nombre: cliente.nombre,
            error: facturaResult.error,
          });
        }
      } catch (error) {
        result.errors.push({
          cliente_nombre: cliente.nombre,
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    revalidatePath("/facturas");
    return createSuccessResult(result);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Error al generar facturas recurrentes"
    );
  }
}
