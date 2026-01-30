import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { saveGoogleOAuthTokens } from "@/lib/actions/google-oauth";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Handles the OAuth callback from Google
 * Exchanges authorization code for access/refresh tokens
 * GET /api/auth/google/callback?code=...&state=...
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/calendario?error=oauth_denied`, request.url)
    );
  }

  // No authorization code provided
  if (!code) {
    return NextResponse.redirect(
      new URL(`/calendario?error=no_code`, request.url)
    );
  }

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Missing required tokens");
    }

    // Save encrypted tokens to database via server action
    const result = await saveGoogleOAuthTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000, // Default 1 hour
      scope: tokens.scope?.split(" ") || [],
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    // Success! Redirect to calendar with success message
    return NextResponse.redirect(
      new URL("/calendario?success=connected", request.url)
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(
        `/calendario?error=token_exchange&details=${encodeURIComponent(
          err instanceof Error ? err.message : "Unknown error"
        )}`,
        request.url
      )
    );
  }
}
