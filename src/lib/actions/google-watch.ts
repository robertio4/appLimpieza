"use server";

import { getAuthenticatedUser, createErrorResult, createSuccessResult } from "@/lib/action-helpers";
import { getGoogleCalendarClient } from "@/lib/google-calendar";
import type { ActionResult } from "@/lib/types";

/**
 * Sets up Google Calendar watch notifications
 * This enables the app to receive notifications when events change in Google Calendar
 * @returns Watch information including expiration time
 */
export async function setupGoogleCalendarWatch(): Promise<
  ActionResult<{ resourceId: string; expiration: string }>
> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const calendar = await getGoogleCalendarClient(user.id);

    // Set up watch notification
    const response = await calendar.events.watch({
      calendarId: "primary",
      requestBody: {
        id: `user-${user.id}`,
        type: "web_hook",
        address: process.env.GOOGLE_CALENDAR_WEBHOOK_URL!,
        // Optional: Set expiration (max 1 week for Calendar API)
        // expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(),
      },
    });

    if (!response.data.resourceId || !response.data.expiration) {
      return createErrorResult("Error al configurar notificaciones");
    }

    return createSuccessResult({
      resourceId: response.data.resourceId,
      expiration: new Date(parseInt(response.data.expiration)).toISOString(),
    });
  } catch (error) {
    return createErrorResult(
      error instanceof Error
        ? error.message
        : "Error al configurar Google Calendar watch"
    );
  }
}

/**
 * Stops Google Calendar watch notifications
 * @param channelId - The channel ID to stop
 * @param resourceId - The resource ID to stop
 */
export async function stopGoogleCalendarWatch(
  channelId: string,
  resourceId: string
): Promise<ActionResult<void>> {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return createErrorResult(authError);
    }

    const calendar = await getGoogleCalendarClient(user.id);

    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      },
    });

    return createSuccessResult(undefined);
  } catch (error) {
    return createErrorResult(
      error instanceof Error
        ? error.message
        : "Error al detener notificaciones"
    );
  }
}
