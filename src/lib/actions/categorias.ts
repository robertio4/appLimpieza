"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, createErrorResult, createSuccessResult } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";
import type {
  CategoriaGasto,
  CategoriaGastoInsert,
  CategoriaGastoUpdate,
} from "@/types/database";

export type { ActionResult } from "@/lib/types";

const DEFAULT_CATEGORIES = [
  { nombre: "Material", color: "#3B82F6" },
  { nombre: "Transporte", color: "#10B981" },
  { nombre: "Nóminas", color: "#F59E0B" },
  { nombre: "Seguros", color: "#8B5CF6" },
  { nombre: "Otros", color: "#6B7280" },
];

export async function getCategorias(): Promise<
  ActionResult<CategoriaGasto[]>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categorias_gasto")
      .select("*")
      .eq("user_id", user.id)
      .order("nombre");

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult(data || []);
  } catch {
    return createErrorResult("Error al obtener las categorías");
  }
}

export async function createCategoria(
  data: Omit<CategoriaGastoInsert, "user_id">
): Promise<ActionResult<CategoriaGasto>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data: categoria, error } = await supabase
      .from("categorias_gasto")
      .insert({ ...data, user_id: user.id })
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/gastos");
    return createSuccessResult(categoria);
  } catch {
    return createErrorResult("Error al crear la categoría");
  }
}

export async function updateCategoria(
  id: string,
  data: CategoriaGastoUpdate
): Promise<ActionResult<CategoriaGasto>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data: categoria, error } = await supabase
      .from("categorias_gasto")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/gastos");
    return createSuccessResult(categoria);
  } catch {
    return createErrorResult("Error al actualizar la categoría");
  }
}

export async function deleteCategoria(
  id: string
): Promise<ActionResult> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("categorias_gasto")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/gastos");
    return createSuccessResult(undefined);
  } catch {
    return createErrorResult("Error al eliminar la categoría");
  }
}

export async function initializeDefaultCategorias(): Promise<
  ActionResult<CategoriaGasto[]>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("categorias_gasto")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      const { data } = await supabase
        .from("categorias_gasto")
        .select("*")
        .eq("user_id", user.id)
        .order("nombre");
      return createSuccessResult(data || []);
    }

    const categoriesToInsert = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from("categorias_gasto")
      .insert(categoriesToInsert)
      .select();

    if (error) {
      return createErrorResult(error.message);
    }

    revalidatePath("/gastos");
    return createSuccessResult(data || []);
  } catch {
    return createErrorResult("Error al inicializar las categorías");
  }
}
