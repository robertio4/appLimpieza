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
