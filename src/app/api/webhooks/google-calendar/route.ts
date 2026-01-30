import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook endpoint for Google Calendar notifications
 * Receives notifications when events are modified in Google Calendar
 * POST /api/webhooks/google-calendar
 */
export async function POST(request: NextRequest) {
  try {
    // Get notification headers
    const channelId = request.headers.get("X-Goog-Channel-ID");
    const resourceState = request.headers.get("X-Goog-Resource-State");
    const resourceId = request.headers.get("X-Goog-Resource-ID");

    console.log("Google Calendar webhook received:", {
      channelId,
      resourceState,
      resourceId,
    });

    // Initial sync notification - just acknowledge
    if (resourceState === "sync") {
      return NextResponse.json({ success: true, message: "Sync acknowledged" });
    }

    // Handle actual changes (exists, not_exists, etc.)
    if (resourceState === "exists") {
      // Extract user ID from channel ID (format: user-{userId})
      const userId = channelId?.replace("user-", "");

      if (!userId) {
        return NextResponse.json(
          { success: false, error: "Invalid channel ID" },
          { status: 400 }
        );
      }

      // TODO: Implement sync logic to pull changes from Google Calendar
      // This would involve:
      // 1. Getting the user's Google Calendar client
      // 2. Fetching recent events
      // 3. Comparing with database trabajos
      // 4. Updating any changes made in Google Calendar

      // For now, just acknowledge
      console.log(`Changes detected for user ${userId}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests (for webhook verification)
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Google Calendar webhook endpoint",
  });
}
