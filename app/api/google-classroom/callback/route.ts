import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";
import { exchangeCodeForTokens } from "@/utils/google-classroom";
import { getUrl } from "@/utils/url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/google-classroom/callback
 * Handles OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This should be the user ID
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        `${getUrl("/dashboard", request)}?error=google_oauth_failed&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${getUrl("/dashboard", request)}?error=no_code&message=${encodeURIComponent("No authorization code received")}`
      );
    }

    // Verify user session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.redirect(
        `${getUrl("/auth", request)}?error=session_expired`
      );
    }

    // Verify state matches user ID (security check)
    if (state && state !== session.user.id) {
      return NextResponse.redirect(
        `${getUrl("/dashboard", request)}?error=state_mismatch`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user's Google profile to get classroom ID
    const { getAuthenticatedClient, getClassroomClient } = await import("@/utils/google-classroom");
    const oauth2Client = getAuthenticatedClient(
      tokens.access_token,
      tokens.refresh_token
    );
    
    let googleClassroomId = session.user.id;
    
    try {
      const classroom = getClassroomClient(oauth2Client);
      
      // Get user profile
      const profileResponse = await classroom.userProfiles.get({
        userId: "me",
      });

      googleClassroomId = profileResponse.data.id || session.user.id;
    } catch (profileError) {
      console.warn("Could not fetch Google profile, using user ID:", profileError);
      // Continue with user ID as fallback
    }

    // Store tokens in database
    const { error: upsertError } = await (supabase
      .from("google_classroom_integrations") as any)
      .upsert(
        {
          user_id: session.user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
          google_classroom_id: googleClassroomId,
          sync_status: "pending",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("Error storing tokens:", upsertError);
      return NextResponse.redirect(
        `${getUrl("/dashboard", request)}?error=token_storage_failed&message=${encodeURIComponent(upsertError.message || "Failed to store tokens")}`
      );
    }

    // Update profile with Google Classroom ID (if column exists, ignore errors if it doesn't)
    const { error: profileUpdateError } = await (supabase
      .from("profiles") as any)
      .update({
        google_classroom_id: googleClassroomId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    if (profileUpdateError) {
      console.warn("Warning: Could not update profile with google_classroom_id:", profileUpdateError);
      // Continue anyway - this is not critical
    }

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      `${getUrl("/dashboard", request)}?success=google_connected&message=${encodeURIComponent("Google Classroom connected successfully!")}`
    );
  } catch (error: any) {
    console.error("Error in Google OAuth callback:", error);
    return NextResponse.redirect(
      `${getUrl("/dashboard", request)}?error=callback_failed&message=${encodeURIComponent(error?.message || "Failed to complete Google OAuth")}`
    );
  }
}

