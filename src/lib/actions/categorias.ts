"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  CategoriaGasto,
  CategoriaGastoInsert,
  CategoriaGastoUpdate,
} from "@/types/database";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const { data, error } = await supabase
      .from("categorias_gasto")
      .select("*")
      .eq("user_id", user.id)
      .order("nombre");

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch {
    return { success: false, error: "Error al obtener las categorías" };
  }
}

export async function createCategoria(
  data: Omit<CategoriaGastoInsert, "user_id">
): Promise<ActionResult<CategoriaGasto>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const { data: categoria, error } = await supabase
      .from("categorias_gasto")
      .insert({ ...data, user_id: user.id })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/gastos");
    return { success: true, data: categoria };
  } catch {
    return { success: false, error: "Error al crear la categoría" };
  }
}

export async function updateCategoria(
  id: string,
  data: CategoriaGastoUpdate
): Promise<ActionResult<CategoriaGasto>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const { data: categoria, error } = await supabase
      .from("categorias_gasto")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/gastos");
    return { success: true, data: categoria };
  } catch {
    return { success: false, error: "Error al actualizar la categoría" };
  }
}

export async function deleteCategoria(
  id: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const { error } = await supabase
      .from("categorias_gasto")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/gastos");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al eliminar la categoría" };
  }
}

export async function initializeDefaultCategorias(): Promise<
  ActionResult<CategoriaGasto[]>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    // Check if user already has categories
    const { data: existing } = await supabase
      .from("categorias_gasto")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      // User already has categories, return them
      const { data } = await supabase
        .from("categorias_gasto")
        .select("*")
        .eq("user_id", user.id)
        .order("nombre");
      return { success: true, data: data || [] };
    }

    // Create default categories
    const categoriesToInsert = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from("categorias_gasto")
      .insert(categoriesToInsert)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/gastos");
    return { success: true, data: data || [] };
  } catch {
    return { success: false, error: "Error al inicializar las categorías" };
  }
}
