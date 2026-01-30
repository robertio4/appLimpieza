"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  createErrorResult,
  createSuccessResult,
} from "@/lib/action-helpers";
import { encryptToken } from "@/lib/encryption";
import type { ActionResult } from "@/lib/types";
import type { GoogleOAuthToken } from "@/types/database";

/**
 * Saves Google OAuth tokens to the database (encrypted)
 * Upserts to handle both initial connection and token refresh
 */
export async function saveGoogleOAuthTokens(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope: string[];
  calendar_id?: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);

    const { error } = await supabase.from("google_oauth_tokens").upsert({
      user_id: user.id,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expiry: new Date(tokens.expiry_date).toISOString(),
      scope: tokens.scope,
      calendar_id: tokens.calendar_id || "primary",
      is_active: true,
    });

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult({ success: true });
  } catch (error) {
    return createErrorResult(
      error instanceof Error
        ? error.message
        : "Error al guardar credenciales de Google"
    );
  }
}

/**
 * Retrieves Google OAuth tokens for the current user
 * Returns null if no tokens exist
 */
export async function getGoogleOAuthTokens(): Promise<
  ActionResult<GoogleOAuthToken | null>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("google_oauth_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // PGRST116 is the "no rows returned" error code - this is expected if not connected
    if (error && error.code !== "PGRST116") {
      return createErrorResult(error.message);
    }

    return createSuccessResult(data);
  } catch (error) {
    return createErrorResult(
      error instanceof Error
        ? error.message
        : "Error al obtener credenciales"
    );
  }
}

/**
 * Revokes Google OAuth access by deleting tokens from database
 * User will need to re-authorize to use Google Calendar features
 */
export async function revokeGoogleOAuthTokens(): Promise<
  ActionResult<{ success: boolean }>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("google_oauth_tokens")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      return createErrorResult(error.message);
    }

    return createSuccessResult({ success: true });
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Error al revocar acceso"
    );
  }
}

/**
 * Checks if the current user has an active Google Calendar connection
 */
export async function hasGoogleCalendarConnection(): Promise<
  ActionResult<boolean>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("google_oauth_tokens")
      .select("id, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      return createErrorResult(error.message);
    }

    return createSuccessResult(!!data);
  } catch (error) {
    return createErrorResult(
      error instanceof Error
        ? error.message
        : "Error al verificar conexión"
    );
  }
}
