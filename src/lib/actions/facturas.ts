"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  Factura,
  FacturaUpdate,
  FacturaConCliente,
  FacturaCompleta,
  LineaFacturaInsert,
  EstadoFactura,
  Cliente,
} from "@/types/database";
import type { ActionResult } from "@/lib/types";
import { IVA_PERCENTAGE } from "@/lib/constants";

export async function getFacturas(): Promise<ActionResult<FacturaConCliente[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const { data, error } = await supabase
      .from("facturas")
      .select(
        `
        *,
        cliente:clientes(*)
      `
      )
      .eq("user_id", user.id)
      .order("fecha", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as FacturaConCliente[]) || [] };
  } catch {
    return { success: false, error: "Error al obtener las facturas" };
  }
}

export async function getFacturasByFilters(
  startDate?: string,
  endDate?: string,
  estado?: EstadoFactura,
  clienteId?: string
): Promise<ActionResult<FacturaConCliente[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    let query = supabase
      .from("facturas")
      .select(
        `
        *,
        cliente:clientes(*)
      `
      )
      .eq("user_id", user.id)
      .order("fecha", { ascending: false });

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
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as FacturaConCliente[]) || [] };
  } catch {
    return { success: false, error: "Error al obtener las facturas" };
  }
}

export async function getFacturaCompleta(
  id: string
): Promise<ActionResult<FacturaCompleta>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

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
      return { success: false, error: error.message };
    }

    return { success: true, data: data as FacturaCompleta };
  } catch {
    return { success: false, error: "Error al obtener la factura" };
  }
}

export async function getNextNumeroFactura(): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Call the database function to generate the next invoice number
    const { data, error } = await supabase.rpc("generate_invoice_number", {
      p_user_id: user.id,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as string };
  } catch {
    return { success: false, error: "Error al generar el número de factura" };
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Generate invoice number
    const numeroResult = await getNextNumeroFactura();
    if (!numeroResult.success) {
      return { success: false, error: numeroResult.error };
    }

    // Calculate totals
    const subtotal = data.lineas.reduce(
      (sum, linea) => sum + linea.cantidad * linea.precio_unitario,
      0
    );
    const iva = subtotal * (IVA_PERCENTAGE / 100);
    const total = subtotal + iva;

    // Insert factura
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
      return { success: false, error: facturaError.message };
    }

    // Insert lineas
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
      // Rollback: delete the factura if lineas failed
      await supabase.from("facturas").delete().eq("id", factura.id);
      return { success: false, error: lineasError.message };
    }

    revalidatePath("/facturas");
    return { success: true, data: factura };
  } catch {
    return { success: false, error: "Error al crear la factura" };
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Prepare factura update
    const facturaUpdate: FacturaUpdate = {};
    if (data.cliente_id) facturaUpdate.cliente_id = data.cliente_id;
    if (data.fecha) facturaUpdate.fecha = data.fecha;
    if (data.fecha_vencimiento !== undefined)
      facturaUpdate.fecha_vencimiento = data.fecha_vencimiento || null;
    if (data.notas !== undefined) facturaUpdate.notas = data.notas || null;

    // If lineas are provided, recalculate totals
    if (data.lineas) {
      const subtotal = data.lineas.reduce(
        (sum, linea) => sum + linea.cantidad * linea.precio_unitario,
        0
      );
      const iva = subtotal * (IVA_PERCENTAGE / 100);
      const total = subtotal + iva;

      facturaUpdate.subtotal = subtotal;
      facturaUpdate.iva = iva;
      facturaUpdate.total = total;

      // Delete existing lineas and insert new ones
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
        return { success: false, error: lineasError.message };
      }
    }

    // Update factura
    const { data: factura, error } = await supabase
      .from("facturas")
      .update(facturaUpdate)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/facturas");
    revalidatePath(`/facturas/${id}`);
    return { success: true, data: factura };
  } catch {
    return { success: false, error: "Error al actualizar la factura" };
  }
}

export async function updateEstadoFactura(
  id: string,
  estado: EstadoFactura
): Promise<ActionResult<Factura>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const { data: factura, error } = await supabase
      .from("facturas")
      .update({ estado })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/facturas");
    revalidatePath(`/facturas/${id}`);
    return { success: true, data: factura };
  } catch {
    return { success: false, error: "Error al actualizar el estado" };
  }
}

export async function deleteFactura(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Delete lineas first (cascade should handle this, but being explicit)
    await supabase.from("lineas_factura").delete().eq("factura_id", id);

    const { error } = await supabase
      .from("facturas")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/facturas");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al eliminar la factura" };
  }
}

export async function getClientes(): Promise<ActionResult<Cliente[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("user_id", user.id)
      .order("nombre", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch {
    return { success: false, error: "Error al obtener los clientes" };
  }
}
