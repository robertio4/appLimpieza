"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, createErrorResult, createSuccessResult } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";
import { IVA_RATE } from "@/lib/constants";
import type {
  Factura,
  FacturaUpdate,
  FacturaConCliente,
  FacturaCompleta,
  LineaFacturaInsert,
  EstadoFactura,
  Cliente,
} from "@/types/database";

export type { ActionResult } from "@/lib/types";

export async function getFacturas(): Promise<ActionResult<FacturaConCliente[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("facturas")
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

    return createSuccessResult((data as FacturaConCliente[]) || []);
  } catch {
    return createErrorResult("Error al obtener las facturas");
  }
}

export async function getFacturasByFilters(
  startDate?: string,
  endDate?: string,
  estado?: EstadoFactura,
  clienteId?: string
): Promise<ActionResult<FacturaConCliente[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    let query = supabase
      .from("facturas")
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

    return createSuccessResult((data as FacturaConCliente[]) || []);
  } catch {
    return createErrorResult("Error al obtener las facturas");
  }
}

export async function getAvailableMonthsFacturas(): Promise<ActionResult<string[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("facturas")
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
      const yearMonth = row.fecha.slice(0, 7);
      months.add(yearMonth);
    }

    return createSuccessResult(Array.from(months));
  } catch {
    return createErrorResult("Error al obtener los meses disponibles");
  }
}

export async function getFacturaCompleta(
  id: string
): Promise<ActionResult<FacturaCompleta>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("facturas")
      .select(
        `
        *,
        cliente:clientes(*),
        lineas_factura(*)
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult(data as FacturaCompleta);
  } catch {
    return createErrorResult("Error al obtener la factura");
  }
}

export async function getNextNumeroFactura(): Promise<ActionResult<string>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("generate_invoice_number", {
      p_user_id: user.id,
    });

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult(data as string);
  } catch {
    return createErrorResult("Error al generar el número de factura");
  }
}

export interface CreateFacturaData {
  cliente_id: string;
  fecha: string;
  fecha_vencimiento?: string;
  notas?: string;
  lineas: Array<{
    concepto: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

export async function createFactura(
  data: CreateFacturaData
): Promise<ActionResult<Factura>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const numeroResult = await getNextNumeroFactura();
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
    const { data: factura, error: facturaError } = await supabase
      .from("facturas")
      .insert({
        user_id: user.id,
        numero: numeroResult.data,
        cliente_id: data.cliente_id,
        fecha: data.fecha,
        fecha_vencimiento: data.fecha_vencimiento || null,
        subtotal,
        iva,
        total,
        estado: "borrador" as EstadoFactura,
        notas: data.notas || null,
      })
      .select()
      .single();

    if (facturaError) {
      return createErrorResult(facturaError.message);
    }

    const lineas: LineaFacturaInsert[] = data.lineas.map((linea) => ({
      factura_id: factura.id,
      concepto: linea.concepto,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
      total: linea.cantidad * linea.precio_unitario,
    }));

    const { error: lineasError } = await supabase
      .from("lineas_factura")
      .insert(lineas);

    if (lineasError) {
      await supabase.from("facturas").delete().eq("id", factura.id);
      return createErrorResult(lineasError.message);
    }

    revalidatePath("/facturas");
    return createSuccessResult(factura);
  } catch {
    return createErrorResult("Error al crear la factura");
  }
}

export interface UpdateFacturaData {
  cliente_id?: string;
  fecha?: string;
  fecha_vencimiento?: string;
  notas?: string;
  lineas?: Array<{
    id?: string;
    concepto: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

export async function updateFactura(
  id: string,
  data: UpdateFacturaData
): Promise<ActionResult<Factura>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const facturaUpdate: FacturaUpdate = {};
    if (data.cliente_id) facturaUpdate.cliente_id = data.cliente_id;
    if (data.fecha) facturaUpdate.fecha = data.fecha;
    if (data.fecha_vencimiento !== undefined)
      facturaUpdate.fecha_vencimiento = data.fecha_vencimiento || null;
    if (data.notas !== undefined) facturaUpdate.notas = data.notas || null;

    if (data.lineas) {
      const subtotal = data.lineas.reduce(
        (sum, linea) => sum + linea.cantidad * linea.precio_unitario,
        0
      );
      const iva = subtotal * IVA_RATE;
      const total = subtotal + iva;

      facturaUpdate.subtotal = subtotal;
      facturaUpdate.iva = iva;
      facturaUpdate.total = total;

      await supabase.from("lineas_factura").delete().eq("factura_id", id);

      const lineas: LineaFacturaInsert[] = data.lineas.map((linea) => ({
        factura_id: id,
        concepto: linea.concepto,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        total: linea.cantidad * linea.precio_unitario,
      }));

      const { error: lineasError } = await supabase
        .from("lineas_factura")
        .insert(lineas);

      if (lineasError) {
        return createErrorResult(lineasError.message);
      }
    }

    const { data: factura, error } = await supabase
      .from("facturas")
      .update(facturaUpdate)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/facturas");
    revalidatePath(`/facturas/${id}`);
    return createSuccessResult(factura);
  } catch {
    return createErrorResult("Error al actualizar la factura");
  }
}

export async function updateEstadoFactura(
  id: string,
  estado: EstadoFactura
): Promise<ActionResult<Factura>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data: factura, error } = await supabase
      .from("facturas")
      .update({ estado })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/facturas");
    revalidatePath(`/facturas/${id}`);
    return createSuccessResult(factura);
  } catch {
    return createErrorResult("Error al actualizar el estado");
  }
}

export async function deleteFactura(id: string): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    await supabase.from("lineas_factura").delete().eq("factura_id", id);

    const { error } = await supabase
      .from("facturas")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/facturas");
    return createSuccessResult(undefined);
  } catch {
    return createErrorResult("Error al eliminar la factura");
  }
}

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
