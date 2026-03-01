"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  createErrorResult,
  createSuccessResult,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";
import { IVA_RATE, PRESUPUESTO_VALIDITY_DAYS } from "@/lib/constants";
import type {
  Presupuesto,
  PresupuestoUpdate,
  PresupuestoConCliente,
  PresupuestoCompleto,
  LineaPresupuestoInsert,
  EstadoPresupuesto,
  Cliente,
  Factura,
} from "@/types/database";

export type { ActionResult } from "@/lib/types";

/**
 * Get all presupuestos for the authenticated user
 */
export async function getPresupuestos(): Promise<
  ActionResult<PresupuestoConCliente[]>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("presupuestos")
      .select(
        `
        *,
        cliente:clientes(*)
      `
      )
      .eq("user_id", user.id)
      .order("numero", { ascending: false });

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult((data as unknown as PresupuestoConCliente[]) || []);
  } catch {
    return createErrorResult("Error al obtener los presupuestos");
  }
}

export async function getAvailableMonthsPresupuestos(): Promise<ActionResult<string[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("presupuestos")
      .select("fecha")
      .eq("user_id", user.id)
      .order("fecha", { ascending: false });

    if (error) {
      return createErrorResult(error.message);
    }

    // Extract unique year-month combinations
    const months = new Set<string>();
    for (const row of data || []) {
      if (!row.fecha) continue;
      // fecha is a Postgres DATE string "YYYY-MM-DD" – derive year-month without Date parsing
      const yearMonth = row.fecha.slice(0, 7); // "YYYY-MM"
      months.add(yearMonth);
    }

    return createSuccessResult(Array.from(months));
  } catch {
    return createErrorResult("Error al obtener los meses disponibles");
  }
}

/**
 * Get presupuestos filtered by date range, estado, and cliente
 */
export async function getPresupuestosByFilters(
  startDate?: string,
  endDate?: string,
  estado?: EstadoPresupuesto,
  clienteId?: string
): Promise<ActionResult<PresupuestoConCliente[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    let query = supabase
      .from("presupuestos")
      .select(
        `
        *,
        cliente:clientes(*)
      `
      )
      .eq("user_id", user.id)
      .order("numero", { ascending: false });

    if (startDate) {
      query = query.gte("fecha", startDate);
    }
    if (endDate) {
      query = query.lte("fecha", endDate);
    }
    if (estado) {
      query = query.eq("estado", estado);
    }
    if (clienteId) {
      query = query.eq("cliente_id", clienteId);
    }

    const { data, error } = await query;

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult((data as unknown as PresupuestoConCliente[]) || []);
  } catch {
    return createErrorResult("Error al obtener los presupuestos");
  }
}

/**
 * Get a complete presupuesto with cliente, lineas, and optionally factura
 */
export async function getPresupuestoCompleto(
  id: string
): Promise<ActionResult<PresupuestoCompleto>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("presupuestos")
      .select(
        `
        *,
        cliente:clientes(*),
        lineas_presupuesto(*),
        factura:facturas(*)
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult(data as unknown as PresupuestoCompleto);
  } catch {
    return createErrorResult("Error al obtener el presupuesto");
  }
}

/**
 * Generate the next presupuesto number for the user
 */
export async function getNextNumeroPresupuesto(): Promise<
  ActionResult<string>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("generate_presupuesto_number", {
      p_user_id: user.id,
    });

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult(data as string);
  } catch {
    return createErrorResult("Error al generar el número de presupuesto");
  }
}

export interface CreatePresupuestoData {
  cliente_id: string;
  fecha: string;
  fecha_validez: string;
  notas?: string;
  lineas: Array<{
    concepto: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

/**
 * Create a new presupuesto with line items
 */
export async function createPresupuesto(
  data: CreatePresupuestoData
): Promise<ActionResult<Presupuesto>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const numeroResult = await getNextNumeroPresupuesto();
    if (!numeroResult.success) {
      return createErrorResult(numeroResult.error);
    }

    const subtotal = data.lineas.reduce(
      (sum, linea) => sum + linea.cantidad * linea.precio_unitario,
      0
    );
    const iva = subtotal * IVA_RATE;
    const total = subtotal + iva;

    const supabase = await createClient();
    const { data: presupuesto, error: presupuestoError } = await supabase
      .from("presupuestos")
      .insert({
        user_id: user.id,
        numero: numeroResult.data,
        cliente_id: data.cliente_id,
        fecha: data.fecha,
        fecha_validez: data.fecha_validez,
        subtotal,
        iva,
        total,
        estado: "pendiente" as EstadoPresupuesto,
        notas: data.notas || null,
      })
      .select()
      .single();

    if (presupuestoError) {
      return createErrorResult(presupuestoError.message);
    }

    const lineas: LineaPresupuestoInsert[] = data.lineas.map((linea) => ({
      presupuesto_id: presupuesto.id,
      concepto: linea.concepto,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
      total: linea.cantidad * linea.precio_unitario,
    }));

    const { error: lineasError } = await supabase
      .from("lineas_presupuesto")
      .insert(lineas);

    if (lineasError) {
      await supabase.from("presupuestos").delete().eq("id", presupuesto.id);
      return createErrorResult(lineasError.message);
    }

    revalidatePath("/presupuestos");
    return createSuccessResult(presupuesto);
  } catch {
    return createErrorResult("Error al crear el presupuesto");
  }
}

export interface UpdatePresupuestoData {
  cliente_id?: string;
  fecha?: string;
  fecha_validez?: string;
  notas?: string;
  lineas?: Array<{
    id?: string;
    concepto: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

/**
 * Update an existing presupuesto
 * Note: Only allows updates if estado is 'pendiente' or 'expirado'
 */
export async function updatePresupuesto(
  id: string,
  data: UpdatePresupuestoData
): Promise<ActionResult<Presupuesto>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Check if presupuesto can be edited
    const { data: existing, error: fetchError } = await supabase
      .from("presupuestos")
      .select("estado")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      return createErrorResult(fetchError.message);
    }

    if (existing.estado === "aceptado") {
      return createErrorResult("No se puede editar un presupuesto aceptado");
    }

    if (existing.estado === "rechazado") {
      return createErrorResult("No se puede editar un presupuesto rechazado");
    }

    const presupuestoUpdate: PresupuestoUpdate = {};
    if (data.cliente_id) presupuestoUpdate.cliente_id = data.cliente_id;
    if (data.fecha) presupuestoUpdate.fecha = data.fecha;
    if (data.fecha_validez)
      presupuestoUpdate.fecha_validez = data.fecha_validez;
    if (data.notas !== undefined)
      presupuestoUpdate.notas = data.notas || null;

    if (data.lineas) {
      const subtotal = data.lineas.reduce(
        (sum, linea) => sum + linea.cantidad * linea.precio_unitario,
        0
      );
      const iva = subtotal * IVA_RATE;
      const total = subtotal + iva;

      presupuestoUpdate.subtotal = subtotal;
      presupuestoUpdate.iva = iva;
      presupuestoUpdate.total = total;

      await supabase.from("lineas_presupuesto").delete().eq("presupuesto_id", id);

      const lineas: LineaPresupuestoInsert[] = data.lineas.map((linea) => ({
        presupuesto_id: id,
        concepto: linea.concepto,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        total: linea.cantidad * linea.precio_unitario,
      }));

      const { error: lineasError } = await supabase
        .from("lineas_presupuesto")
        .insert(lineas);

      if (lineasError) {
        return createErrorResult(lineasError.message);
      }
    }

    const { data: presupuesto, error } = await supabase
      .from("presupuestos")
      .update(presupuestoUpdate)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/presupuestos");
    revalidatePath(`/presupuestos/${id}`);
    return createSuccessResult(presupuesto);
  } catch {
    return createErrorResult("Error al actualizar el presupuesto");
  }
}

/**
 * Update presupuesto estado
 */
export async function updateEstadoPresupuesto(
  id: string,
  estado: EstadoPresupuesto
): Promise<ActionResult<Presupuesto>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data: presupuesto, error } = await supabase
      .from("presupuestos")
      .update({ estado })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/presupuestos");
    revalidatePath(`/presupuestos/${id}`);
    return createSuccessResult(presupuesto);
  } catch {
    return createErrorResult("Error al actualizar el estado");
  }
}

/**
 * Delete a presupuesto
 * Note: Only allows deletion if estado is 'pendiente', 'rechazado', or 'expirado'
 */
export async function deletePresupuesto(id: string): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Check if presupuesto can be deleted
    const { data: existing, error: fetchError } = await supabase
      .from("presupuestos")
      .select("estado")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      return createErrorResult(fetchError.message);
    }

    if (existing.estado === "aceptado") {
      return createErrorResult(
        "No se puede eliminar un presupuesto aceptado. Está vinculado a una factura."
      );
    }

    await supabase.from("lineas_presupuesto").delete().eq("presupuesto_id", id);

    const { error } = await supabase
      .from("presupuestos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/presupuestos");
    return createSuccessResult(undefined);
  } catch {
    return createErrorResult("Error al eliminar el presupuesto");
  }
}

/**
 * Convert a presupuesto to a factura
 * This is the key action that implements the presupuesto → factura flow
 */
export async function convertPresupuestoToFactura(
  presupuestoId: string
): Promise<ActionResult<Factura>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // 1. Get the complete presupuesto
    const { data: presupuesto, error: presupuestoError } = await supabase
      .from("presupuestos")
      .select(
        `
        *,
        lineas_presupuesto(*)
      `
      )
      .eq("id", presupuestoId)
      .eq("user_id", user.id)
      .single();

    if (presupuestoError) {
      return createErrorResult(presupuestoError.message);
    }

    // 2. Validate presupuesto estado
    if (presupuesto.estado === "aceptado") {
      return createErrorResult(
        "Este presupuesto ya ha sido convertido a factura"
      );
    }

    if (presupuesto.estado === "rechazado") {
      return createErrorResult(
        "No se puede convertir un presupuesto rechazado"
      );
    }

    // 3. Generate invoice number
    const { data: numeroFactura, error: numeroError } = await supabase.rpc(
      "generate_invoice_number",
      { p_user_id: user.id }
    );

    if (numeroError) {
      return createErrorResult(numeroError.message);
    }

    // 4. Create the factura
    const { data: factura, error: facturaError } = await supabase
      .from("facturas")
      .insert({
        user_id: user.id,
        numero: numeroFactura as string,
        cliente_id: presupuesto.cliente_id,
        fecha: new Date().toISOString().split("T")[0], // Today's date
        fecha_vencimiento: null,
        subtotal: presupuesto.subtotal,
        iva: presupuesto.iva,
        total: presupuesto.total,
        estado: "borrador",
        notas: presupuesto.notas
          ? `Convertido desde presupuesto ${presupuesto.numero}\n\n${presupuesto.notas}`
          : `Convertido desde presupuesto ${presupuesto.numero}`,
      })
      .select()
      .single();

    if (facturaError) {
      return createErrorResult(facturaError.message);
    }

    // 5. Copy line items to factura
    const lineasFactura = presupuesto.lineas_presupuesto.map(
      (linea) => ({
        factura_id: factura.id,
        concepto: linea.concepto,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        total: linea.total,
      })
    );

    const { error: lineasError } = await supabase
      .from("lineas_factura")
      .insert(lineasFactura);

    if (lineasError) {
      // Rollback: delete the created factura
      await supabase.from("facturas").delete().eq("id", factura.id);
      return createErrorResult(lineasError.message);
    }

    // 6. Update presupuesto to mark as accepted and link to factura
    const { error: updateError } = await supabase
      .from("presupuestos")
      .update({
        estado: "aceptado" as EstadoPresupuesto,
        factura_id: factura.id,
      })
      .eq("id", presupuestoId);

    if (updateError) {
      // Note: We don't rollback here because the factura is already created
      // The presupuesto just won't have the link, but both records exist
      console.error("Error updating presupuesto after conversion:", updateError);
    }

    revalidatePath("/presupuestos");
    revalidatePath(`/presupuestos/${presupuestoId}`);
    revalidatePath("/facturas");
    revalidatePath(`/facturas/${factura.id}`);

    return createSuccessResult(factura);
  } catch {
    return createErrorResult("Error al convertir el presupuesto a factura");
  }
}

/**
 * Duplicate a presupuesto (useful for rejected presupuestos)
 */
export async function duplicatePresupuesto(
  id: string
): Promise<ActionResult<Presupuesto>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // 1. Get the original presupuesto with lines
    const { data: original, error: fetchError } = await supabase
      .from("presupuestos")
      .select(
        `
        *,
        lineas_presupuesto(*)
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      return createErrorResult(fetchError.message);
    }

    // 2. Generate new number
    const numeroResult = await getNextNumeroPresupuesto();
    if (!numeroResult.success) {
      return createErrorResult(numeroResult.error);
    }

    // 3. Calculate new fecha_validez (today + PRESUPUESTO_VALIDITY_DAYS)
    const newFechaValidez = new Date();
    newFechaValidez.setDate(newFechaValidez.getDate() + PRESUPUESTO_VALIDITY_DAYS);

    // 4. Create new presupuesto
    const { data: newPresupuesto, error: createError } = await supabase
      .from("presupuestos")
      .insert({
        user_id: user.id,
        numero: numeroResult.data,
        cliente_id: original.cliente_id,
        fecha: new Date().toISOString().split("T")[0], // Today's date
        fecha_validez: newFechaValidez.toISOString().split("T")[0],
        subtotal: original.subtotal,
        iva: original.iva,
        total: original.total,
        estado: "pendiente" as EstadoPresupuesto,
        notas: original.notas
          ? `Duplicado de presupuesto ${original.numero}\n\n${original.notas}`
          : `Duplicado de presupuesto ${original.numero}`,
        factura_id: null,
      })
      .select()
      .single();

    if (createError) {
      return createErrorResult(createError.message);
    }

    // 5. Copy line items
    const lineas: LineaPresupuestoInsert[] =
      original.lineas_presupuesto.map((linea) => ({
      presupuesto_id: newPresupuesto.id,
      concepto: linea.concepto,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
      total: linea.total,
    }));

    const { error: lineasError } = await supabase
      .from("lineas_presupuesto")
      .insert(lineas);

    if (lineasError) {
      await supabase.from("presupuestos").delete().eq("id", newPresupuesto.id);
      return createErrorResult(lineasError.message);
    }

    revalidatePath("/presupuestos");
    return createSuccessResult(newPresupuesto);
  } catch {
    return createErrorResult("Error al duplicar el presupuesto");
  }
}

/**
 * Get clientes for dropdown selection (reused from facturas)
 */
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

    return createSuccessResult(data || []);
  } catch {
    return createErrorResult("Error al obtener los clientes");
  }
}
