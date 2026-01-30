import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

/**
 * Initiates the Google OAuth flow
 * Redirects user to Google's consent screen
 * GET /api/auth/google
 */
export async function GET(request: NextRequest) {
  try {
    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // Request refresh token
      scope: SCOPES,
      prompt: "consent", // Force consent to ensure we get refresh token
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Google OAuth:", error);
    return NextResponse.redirect(
      new URL("/calendario?error=oauth_init_failed", request.url)
    );
  }
}
