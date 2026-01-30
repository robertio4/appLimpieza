import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { decryptToken, encryptToken } from "@/lib/encryption";
import type { Trabajo, Cliente } from "@/types/database";

/**
 * Creates an authenticated Google Calendar client for a user
 * Handles token refresh automatically
 * @throws Error if user doesn't have active Google Calendar connection
 */
export async function getGoogleCalendarClient(userId: string) {
  const supabase = await createClient();

  // Fetch user's OAuth tokens
  const { data: tokenData, error } = await supabase
    .from("google_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error || !tokenData) {
    throw new Error("No active Google Calendar connection");
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Set credentials with decrypted tokens
  oauth2Client.setCredentials({
    access_token: decryptToken(tokenData.access_token),
    refresh_token: decryptToken(tokenData.refresh_token),
    expiry_date: new Date(tokenData.token_expiry).getTime(),
  });

  // Listen for token refresh events and update database
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      const updates: { access_token: string; token_expiry?: string } = {
        access_token: encryptToken(tokens.access_token),
      };

      if (tokens.expiry_date) {
        updates.token_expiry = new Date(tokens.expiry_date).toISOString();
      }

      await supabase
        .from("google_oauth_tokens")
        .update(updates)
        .eq("user_id", userId);
    }
  });

  // Return authenticated calendar client
  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Converts a Trabajo to Google Calendar event format
 * @param trabajo - The trabajo with optional cliente data
 * @returns Google Calendar event object
 */
export function trabajoToGoogleEvent(
  trabajo: Trabajo & { cliente?: Cliente | null }
) {
  return {
    summary: trabajo.titulo,
    description: trabajo.descripcion || "",
    location: trabajo.direccion || trabajo.cliente?.direccion || "",
    start: {
      dateTime: trabajo.fecha_inicio,
      timeZone: "Europe/Madrid",
    },
    end: {
      dateTime: trabajo.fecha_fin,
      timeZone: "Europe/Madrid",
    },
    extendedProperties: {
      private: {
        appTrabajoId: trabajo.id,
        clienteId: trabajo.cliente_id,
        clienteNombre: trabajo.cliente?.nombre || "",
        tipoServicio: trabajo.tipo_servicio,
        estado: trabajo.estado,
      },
    },
    // Color based on service type (optional)
    colorId: getColorIdForTipoServicio(trabajo.tipo_servicio),
  };
}

/**
 * Maps service type to Google Calendar color ID
 * Google Calendar color IDs: 1-11 (see https://developers.google.com/calendar/api/v3/reference/colors)
 */
function getColorIdForTipoServicio(
  tipo: Trabajo["tipo_servicio"]
): string | undefined {
  const colorMap: Record<Trabajo["tipo_servicio"], string> = {
    limpieza_general: "9", // Blue
    limpieza_profunda: "11", // Red
    limpieza_oficina: "10", // Green
    limpieza_cristales: "5", // Yellow
    otros: "8", // Gray
  };

  return colorMap[tipo];
}

/**
 * Converts a Google Calendar event back to Trabajo update data
 * Used for syncing changes made in Google Calendar back to the app
 */
export function googleEventToTrabajoUpdate(
  event: any
): Partial<Trabajo> | null {
  // Extract our custom properties
  const privateProps = event.extendedProperties?.private;

  if (!privateProps?.appTrabajoId) {
    // Not one of our events
    return null;
  }

  return {
    titulo: event.summary || "",
    descripcion: event.description || null,
    direccion: event.location || null,
    fecha_inicio: event.start?.dateTime || event.start?.date,
    fecha_fin: event.end?.dateTime || event.end?.date,
  };
}
