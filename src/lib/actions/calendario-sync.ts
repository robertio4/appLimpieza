"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  createErrorResult,
  createSuccessResult,
} from "@/lib/action-helpers";
import {
  getGoogleCalendarClient,
  trabajoToGoogleEvent,
} from "@/lib/google-calendar";
import type { ActionResult } from "@/lib/types";

/**
 * Syncs a trabajo to Google Calendar
 * Creates a new event if not yet synced, updates if already synced
 * @param trabajoId - The ID of the trabajo to sync
 * @returns The Google Calendar event ID
 */
export async function syncTrabajoToGoogle(
  trabajoId: string,
): Promise<ActionResult<{ eventId: string }>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Fetch trabajo with cliente data
    const { data: trabajo, error: trabajoError } = await supabase
      .from("trabajos")
      .select("*, cliente:clientes(*)")
      .eq("id", trabajoId)
      .eq("user_id", user.id)
      .single();

    if (trabajoError) {
      return createErrorResult(trabajoError.message);
    }

    // Check if user has Google Calendar connected
    const { data: tokenData } = await supabase
      .from("google_oauth_tokens")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!tokenData) {
      return createErrorResult(
        "Google Calendar no conectado. Conéctalo primero desde la página de calendario.",
      );
    }

    // Get authenticated Google Calendar client
    const calendar = await getGoogleCalendarClient(user.id);

    // Check if trabajo is already synced
    const { data: existingSync } = await supabase
      .from("calendario_sync")
      .select("google_event_id")
      .eq("trabajo_id", trabajoId)
      .single();

    let eventId: string;

    if (existingSync?.google_event_id) {
      // Update existing event
      try {
        const response = await calendar.events.update({
          calendarId: "primary",
          eventId: existingSync.google_event_id,
          requestBody: trabajoToGoogleEvent(trabajo),
        });
        eventId = response.data.id!;
      } catch (error: unknown) {
        // Event might have been deleted in Google Calendar
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === 404
        ) {
          // Create a new event instead
          const response = await calendar.events.insert({
            calendarId: "primary",
            requestBody: trabajoToGoogleEvent(trabajo),
          });
          eventId = response.data.id!;
        } else {
          throw error;
        }
      }

      // Update sync record
      await supabase
        .from("calendario_sync")
        .update({
          google_event_id: eventId,
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("trabajo_id", trabajoId);
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: trabajoToGoogleEvent(trabajo),
      });
      eventId = response.data.id!;

      // Create sync record
      await supabase.from("calendario_sync").insert({
        user_id: user.id,
        trabajo_id: trabajoId,
        google_event_id: eventId,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      });
    }

    return createSuccessResult({ eventId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error de sincronización";

    // Log error in sync table if sync record exists
    try {
      const { user } = await getAuthenticatedUser();
      if (user) {
        const supabase = await createClient();
        await supabase
          .from("calendario_sync")
          .update({ sync_status: "error", error_message: message })
          .eq("trabajo_id", trabajoId);
      }
    } catch {
      // Ignore errors updating sync status
    }

    return createErrorResult(message);
  }
}

/**
 * Deletes a Google Calendar event when a trabajo is deleted
 * @param trabajoId - The ID of the trabajo being deleted
 */
export async function deleteGoogleEvent(
  trabajoId: string,
): Promise<ActionResult<void>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Get sync record
    const { data: sync } = await supabase
      .from("calendario_sync")
      .select("google_event_id")
      .eq("trabajo_id", trabajoId)
      .single();

    // If no sync record, nothing to delete
    if (!sync?.google_event_id) {
      return createSuccessResult(undefined);
    }

    // Check if user has Google Calendar connected
    const { data: tokenData } = await supabase
      .from("google_oauth_tokens")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!tokenData) {
      // User disconnected Google Calendar, just delete sync record
      await supabase
        .from("calendario_sync")
        .delete()
        .eq("trabajo_id", trabajoId);
      return createSuccessResult(undefined);
    }

    try {
      // Get Google Calendar client
      const calendar = await getGoogleCalendarClient(user.id);

      // Delete the event from Google Calendar
      await calendar.events.delete({
        calendarId: "primary",
        eventId: sync.google_event_id,
      });
    } catch (error: unknown) {
      // If event already deleted (404), that's fine
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code !== 404
      ) {
        console.error("Error deleting Google Calendar event:", error);
        // Continue to delete sync record anyway
      }
    }

    // Delete sync record from database
    await supabase.from("calendario_sync").delete().eq("trabajo_id", trabajoId);

    return createSuccessResult(undefined);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Error al eliminar evento",
    );
  }
}

/**
 * Syncs all trabajos for the current user to Google Calendar
 * Useful for initial sync or fixing sync issues
 */
export async function syncAllTrabajosToGoogle(): Promise<
  ActionResult<{ synced: number; errors: number }>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Get all trabajos that aren't cancelled
    const { data: trabajos, error } = await supabase
      .from("trabajos")
      .select("id")
      .eq("user_id", user.id)
      .neq("estado", "cancelado");

    if (error) {
      return createErrorResult(error.message);
    }

    let synced = 0;
    let errors = 0;

    // Sync each trabajo
    for (const trabajo of trabajos || []) {
      const result = await syncTrabajoToGoogle(trabajo.id);
      if (result.success) {
        synced++;
      } else {
        errors++;
      }
    }

    return createSuccessResult({ synced, errors });
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : "Error al sincronizar trabajos",
    );
  }
}

/**
 * Pulls events from Google Calendar and updates trabajos
 * Updates existing trabajos if their Google Calendar events were modified
 */
export async function pullFromGoogleCalendar(): Promise<
  ActionResult<{ updated: number; unchanged: number }>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Get Google Calendar client
    const calendar = await getGoogleCalendarClient(user.id);

    // Get events from the last 3 months to 3 months in the future
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 3);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    let updated = 0;
    let unchanged = 0;

    for (const event of events) {
      // Skip events without our app marker
      const appTrabajoId = event.extendedProperties?.private?.appTrabajoId;

      if (!appTrabajoId || !event.start?.dateTime || !event.end?.dateTime) {
        continue;
      }

      // Get the trabajo from database
      const { data: trabajo, error: trabajoError } = await supabase
        .from("trabajos")
        .select("*")
        .eq("id", appTrabajoId)
        .eq("user_id", user.id)
        .single();

      if (trabajoError || !trabajo) {
        continue;
      }

      // Check if event was modified in Google Calendar
      const googleStart = new Date(event.start.dateTime).toISOString();
      const googleEnd = new Date(event.end.dateTime).toISOString();
      const googleTitle = event.summary || "";
      const googleDescription = event.description || "";
      const googleLocation = event.location || "";

      const hasChanges =
        googleStart !== trabajo.fecha_inicio ||
        googleEnd !== trabajo.fecha_fin ||
        googleTitle !== trabajo.titulo ||
        googleDescription !== (trabajo.descripcion || "") ||
        googleLocation !== (trabajo.direccion || "");

      if (hasChanges) {
        // Update trabajo with changes from Google Calendar
        await supabase
          .from("trabajos")
          .update({
            titulo: googleTitle,
            descripcion: googleDescription || null,
            direccion: googleLocation || null,
            fecha_inicio: googleStart,
            fecha_fin: googleEnd,
          })
          .eq("id", appTrabajoId);

        // Update sync record
        await supabase
          .from("calendario_sync")
          .update({
            sync_status: "synced",
            last_synced_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("trabajo_id", appTrabajoId);

        updated++;
      } else {
        unchanged++;
      }
    }

    return createSuccessResult({ updated, unchanged });
  } catch (error) {
    return createErrorResult(
      error instanceof Error
        ? error.message
        : "Error al sincronizar desde Google Calendar",
    );
  }
}

/**
 * Imports events from Google Calendar as new trabajos
 * Creates trabajos for Google Calendar events that aren't yet in the database
 * @returns Number of events imported and skipped
 */
export async function importFromGoogleCalendar(): Promise<
  ActionResult<{ imported: number; skipped: number }>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const supabase = await createClient();

    // Get Google Calendar client
    const calendar = await getGoogleCalendarClient(user.id);

    // Get events from the last 3 months to 6 months in the future
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 3);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 6);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250, // Limit to avoid overwhelming the system
    });

    const events = response.data.items || [];
    let imported = 0;
    let skipped = 0;

    // Get all existing sync records to check which events are already imported
    const { data: existingSyncs } = await supabase
      .from("calendario_sync")
      .select("google_event_id")
      .eq("user_id", user.id);

    const existingEventIds = new Set(
      (existingSyncs || []).map((sync) => sync.google_event_id),
    );

    // Get the default client (first client or create a generic one)
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    let defaultClienteId: string;

    if (!clientes) {
      // Create a default "General" client for imported events
      const { data: newCliente, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          user_id: user.id,
          nombre: "Cliente General (Importado)",
          email: "",
          telefono: "",
        })
        .select("id")
        .single();

      if (clienteError || !newCliente) {
        return createErrorResult(
          "No se pudo crear cliente predeterminado para importar eventos",
        );
      }
      defaultClienteId = newCliente.id;
    } else {
      defaultClienteId = clientes.id;
    }

    for (const event of events) {
      // Skip if event doesn't have required fields
      if (!event.id || !event.start?.dateTime || !event.end?.dateTime) {
        skipped++;
        continue;
      }

      // Skip if event already exists
      if (existingEventIds.has(event.id)) {
        skipped++;
        continue;
      }

      // Skip all-day events (we only support timed events)
      if (event.start.date || event.end.date) {
        skipped++;
        continue;
      }

      // Skip declined events
      if (event.status === "cancelled") {
        skipped++;
        continue;
      }

      try {
        // Create trabajo from Google Calendar event
        const { data: trabajo, error: trabajoError } = await supabase
          .from("trabajos")
          .insert({
            user_id: user.id,
            cliente_id: defaultClienteId,
            titulo: event.summary || "Evento importado",
            descripcion: event.description || null,
            direccion: event.location || null,
            fecha_inicio: new Date(event.start.dateTime).toISOString(),
            fecha_fin: new Date(event.end.dateTime).toISOString(),
            tipo_servicio: "limpieza_general",
            estado: "pendiente",
          })
          .select("id")
          .single();

        if (trabajoError || !trabajo) {
          console.error("Error creating trabajo:", trabajoError);
          skipped++;
          continue;
        }

        // Create sync record
        await supabase.from("calendario_sync").insert({
          user_id: user.id,
          trabajo_id: trabajo.id,
          google_event_id: event.id,
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
        });

        imported++;
      } catch (err) {
        console.error("Error importing event:", err);
        skipped++;
      }
    }

    return createSuccessResult({ imported, skipped });
  } catch (error) {
    return createErrorResult(
      error instanceof Error
        ? error.message
        : "Error al importar desde Google Calendar",
    );
  }
}
