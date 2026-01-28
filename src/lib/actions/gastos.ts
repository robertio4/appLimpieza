"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, createErrorResult, createSuccessResult } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";
import type {
  Gasto,
  GastoInsert,
  GastoUpdate,
  GastoConCategoria,
} from "@/types/database";

export type { ActionResult } from "@/lib/types";

export async function getGastos(): Promise<ActionResult<GastoConCategoria[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gastos")
      .select(
        `
        *,
        categoria:categorias_gasto(*)
      `
      )
      .eq("user_id", user.id)
      .order("fecha", { ascending: false });

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult((data as GastoConCategoria[]) || []);
  } catch {
    return createErrorResult("Error al obtener los gastos");
  }
}

export async function getGastosByDateRange(
  startDate: string,
  endDate: string,
  categoriaId?: string
): Promise<ActionResult<GastoConCategoria[]>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    let query = supabase
      .from("gastos")
      .select(
        `
        *,
        categoria:categorias_gasto(*)
      `
      )
      .eq("user_id", user.id)
      .gte("fecha", startDate)
      .lte("fecha", endDate)
      .order("fecha", { ascending: false });

    if (categoriaId) {
      query = query.eq("categoria_id", categoriaId);
    }

    const { data, error } = await query;

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult((data as GastoConCategoria[]) || []);
  } catch {
    return createErrorResult("Error al obtener los gastos");
  }
}

export async function getGasto(
  id: string
): Promise<ActionResult<GastoConCategoria>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gastos")
      .select(
        `
        *,
        categoria:categorias_gasto(*)
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult(data as GastoConCategoria);
  } catch {
    return createErrorResult("Error al obtener el gasto");
  }
}

export async function createGasto(
  data: Omit<GastoInsert, "user_id">
): Promise<ActionResult<Gasto>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data: gasto, error } = await supabase
      .from("gastos")
      .insert({ ...data, user_id: user.id })
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/gastos");
    return createSuccessResult(gasto);
  } catch {
    return createErrorResult("Error al crear el gasto");
  }
}

export async function updateGasto(
  id: string,
  data: GastoUpdate
): Promise<ActionResult<Gasto>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data: gasto, error } = await supabase
      .from("gastos")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/gastos");
    return createSuccessResult(gasto);
  } catch {
    return createErrorResult("Error al actualizar el gasto");
  }
}

export async function deleteGasto(id: string): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("gastos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/gastos");
    return createSuccessResult(undefined);
  } catch {
    return createErrorResult("Error al eliminar el gasto");
  }
}
