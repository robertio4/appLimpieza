import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "./types";

/**
 * Gets the authenticated user from Supabase
 * Returns the user object or an error result
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: "No autenticado" as const };
  }

  return { user, error: null };
}

/**
 * Creates an error result with a consistent format
 */
export function createErrorResult(error: string): ActionResult<never> {
  return { success: false, error };
}

/**
 * Creates a success result with data
 */
export function createSuccessResult<T>(data: T): ActionResult<T> {
  return { success: true, data };
}
