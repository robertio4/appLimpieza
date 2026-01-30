"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  createErrorResult,
  createSuccessResult,
} from "@/lib/action-helpers";
import { syncTrabajoToGoogle, deleteGoogleEvent } from "./calendario-sync";
import type { ActionResult } from "@/lib/types";
import type {
  Trabajo,
  TrabajoConCliente,
  TrabajoInsert,
  TrabajoUpdate,
} from "@/types/database";
import { IVA_RATE } from "@/lib/constants";

/**
 * Retrieves all trabajos for the current user
 * Includes cliente data
 */
export async function getTrabajos(): Promise<
  ActionResult<TrabajoConCliente[]>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("trabajos")
      .select("*, cliente:clientes(*)")
      .eq("user_id", user.id)
      .order("fecha_inicio", { ascending: true });

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult(data as TrabajoConCliente[]);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Error al cargar trabajos",
    );
  }
}

/**
 * Gets a single trabajo by ID with all related data
 */
export async function getTrabajo(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ActionResult<any>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("trabajos")
      .select(
        "*, cliente:clientes(*), factura:facturas(*), sync:calendario_sync(*)",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult(data);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Error al cargar trabajo",
    );
  }
}

/**
 * Creates a new trabajo and automatically syncs to Google Calendar
 */
export async function createTrabajo(
  trabajo: Omit<TrabajoInsert, "user_id">,
): Promise<ActionResult<Trabajo>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Create trabajo
    const { data, error } = await supabase
      .from("trabajos")
      .insert({ ...trabajo, user_id: user.id })
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    // Auto-sync to Google Calendar (don't fail if sync fails)
    try {
      await syncTrabajoToGoogle(data.id);
    } catch (error) {
      console.error("Error syncing to Google Calendar:", error);
      // Continue - trabajo was created successfully
    }

    revalidatePath("/calendario");
    return createSuccessResult(data);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Error al crear trabajo",
    );
  }
}

/**
 * Updates an existing trabajo and syncs changes to Google Calendar
 */
export async function updateTrabajo(
  id: string,
  trabajo: Partial<TrabajoUpdate>,
): Promise<ActionResult<Trabajo>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Update trabajo
    const { data, error } = await supabase
      .from("trabajos")
      .update(trabajo)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    // Auto-sync changes to Google Calendar
    try {
      await syncTrabajoToGoogle(id);
    } catch (error) {
      console.error("Error syncing to Google Calendar:", error);
      // Continue - trabajo was updated successfully
    }

    revalidatePath("/calendario");
    return createSuccessResult(data);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Error al actualizar trabajo",
    );
  }
}

/**
 * Deletes a trabajo and its Google Calendar event
 */
export async function deleteTrabajo(id: string): Promise<ActionResult<void>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Delete from Google Calendar first
    try {
      await deleteGoogleEvent(id);
    } catch (error) {
      console.error("Error deleting from Google Calendar:", error);
      // Continue with database deletion
    }

    // Delete trabajo from database
    const { error } = await supabase
      .from("trabajos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/calendario");
    return createSuccessResult(undefined);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Error al eliminar trabajo",
    );
  }
}

/**
 * Completes a trabajo and automatically creates a draft invoice
 * Links the invoice to the trabajo
 */
export async function completarTrabajo(
  id: string,
): Promise<ActionResult<{ factura_id: string }>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Get trabajo details
    const { data: trabajo, error: trabajoError } = await supabase
      .from("trabajos")
      .select("*, cliente:clientes(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (trabajoError) {
      return createErrorResult(trabajoError.message);
    }

    // Check if trabajo already has an invoice
    if (trabajo.factura_id) {
      return createErrorResult("Este trabajo ya tiene una factura asociada");
    }

    // Update trabajo status to completed
    await supabase
      .from("trabajos")
      .update({ estado: "completado" })
      .eq("id", id);

    // Generate invoice number
    const { data: numeroResult, error: numeroError } = await supabase.rpc(
      "generate_invoice_number",
      { p_user_id: user.id },
    );

    if (numeroError) {
      return createErrorResult(numeroError.message);
    }

    // Calculate invoice amounts
    const subtotal = trabajo.precio_acordado || 0;
    const iva = subtotal * IVA_RATE;
    const total = subtotal + iva;

    // Create draft invoice
    const { data: factura, error: facturaError } = await supabase
      .from("facturas")
      .insert({
        user_id: user.id,
        cliente_id: trabajo.cliente_id,
        numero: numeroResult,
        fecha: new Date().toISOString().split("T")[0],
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        subtotal,
        iva,
        total,
        estado: "borrador",
        notas: `Trabajo completado: ${trabajo.titulo}`,
      })
      .select()
      .single();

    if (facturaError) {
      return createErrorResult(facturaError.message);
    }

    // Add line item to invoice
    await supabase.from("lineas_factura").insert({
      factura_id: factura.id,
      concepto: trabajo.titulo,
      cantidad: 1,
      precio_unitario: subtotal,
      total: subtotal,
    });

    // Link invoice to trabajo
    await supabase
      .from("trabajos")
      .update({ factura_id: factura.id })
      .eq("id", id);

    // Sync updated status to Google Calendar
    try {
      await syncTrabajoToGoogle(id);
    } catch (error) {
      console.error("Error syncing to Google Calendar:", error);
    }

    revalidatePath("/calendario");
    revalidatePath("/facturas");
    revalidatePath(`/facturas/${factura.id}`);

    return createSuccessResult({ factura_id: factura.id });
  } catch (error) {
    return createErrorResult(
      error instanceof Error
        ? error.message
        : "Error al completar trabajo y crear factura",
    );
  }
}

/**
 * Creates multiple trabajos for recurring jobs
 * @param baseJobId - The ID of the parent/template job
 * @param occurrences - Number of occurrences to create
 * @param pattern - 'weekly', 'biweekly', or 'monthly'
 */
export async function createRecurringTrabajos(
  baseJobId: string,
  occurrences: number,
  pattern: "weekly" | "biweekly" | "monthly",
): Promise<ActionResult<{ created: number }>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Get base job
    const { data: baseJob, error: baseJobError } = await supabase
      .from("trabajos")
      .select("*")
      .eq("id", baseJobId)
      .eq("user_id", user.id)
      .single();

    if (baseJobError) {
      return createErrorResult(baseJobError.message);
    }

    // Calculate interval in days
    const intervalDays =
      pattern === "weekly" ? 7 : pattern === "biweekly" ? 14 : 30;

    // Create occurrences
    const trabajosToCreate = [];
    for (let i = 1; i <= occurrences; i++) {
      const startDate = new Date(baseJob.fecha_inicio);
      const endDate = new Date(baseJob.fecha_fin);

      startDate.setDate(startDate.getDate() + intervalDays * i);
      endDate.setDate(endDate.getDate() + intervalDays * i);

      trabajosToCreate.push({
        user_id: user.id,
        cliente_id: baseJob.cliente_id,
        titulo: baseJob.titulo,
        descripcion: baseJob.descripcion,
        tipo_servicio: baseJob.tipo_servicio,
        estado: "pendiente" as const,
        fecha_inicio: startDate.toISOString(),
        fecha_fin: endDate.toISOString(),
        direccion: baseJob.direccion,
        precio_acordado: baseJob.precio_acordado,
        es_recurrente: true,
        recurrencia_patron: pattern,
        recurrencia_padre_id: baseJobId,
      });
    }

    // Insert all occurrences
    const { data, error } = await supabase
      .from("trabajos")
      .insert(trabajosToCreate)
      .select();

    if (error) {
      return createErrorResult(error.message);
    }

    // Sync all new trabajos to Google Calendar
    for (const trabajo of data || []) {
      try {
        await syncTrabajoToGoogle(trabajo.id);
      } catch (error) {
        console.error(`Error syncing trabajo ${trabajo.id}:`, error);
      }
    }

    revalidatePath("/calendario");
    return createSuccessResult({ created: data?.length || 0 });
  } catch (error) {
    return createErrorResult(
      error instanceof Error
        ? error.message
        : "Error al crear trabajos recurrentes",
    );
  }
}
