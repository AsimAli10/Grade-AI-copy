import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
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
    
    let googleClassroomId: string | null = null;
    
    try {
      const classroom = getClassroomClient(oauth2Client);
      
      // Get user profile to get the actual Google Classroom ID
      const profileResponse = await classroom.userProfiles.get({
        userId: "me",
      });

      googleClassroomId = profileResponse.data.id || null;
      
      if (!googleClassroomId) {
        console.error("Google Classroom profile ID is missing");
        return NextResponse.redirect(
          `${getUrl("/dashboard", request)}?error=profile_fetch_failed&message=${encodeURIComponent("Could not retrieve Google Classroom profile. Please try again.")}`
        );
      }
    } catch (profileError) {
      console.error("Error fetching Google profile:", profileError);
      return NextResponse.redirect(
        `${getUrl("/dashboard", request)}?error=profile_fetch_failed&message=${encodeURIComponent("Could not retrieve Google Classroom profile. Please try again.")}`
      );
    }

    // Check if this Google Classroom is already connected to another user
    
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Try to use admin client if available, otherwise fall back to regular client
    let adminClient: ReturnType<typeof createClient<Database>> | null = null;
    
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: {
            persistSession: false,
          },
        });
      } catch (error) {
        console.error("Failed to create admin client:", error);
      }
    }

    // If admin client is not available, try with regular client (will be limited by RLS)
    const checkClient = adminClient || supabase;
    
    const { data: existingIntegrations, error: checkError } = await (checkClient as any)
      .from("google_classroom_integrations")
      .select("user_id, google_classroom_id")
      .eq("google_classroom_id", googleClassroomId);

    if (checkError) {
      console.error("Error checking existing integration:", checkError);
      // If it's an RLS error and we don't have admin client, the unique constraint will catch it
      if (!adminClient && checkError.code === '42501') {
        console.warn("RLS restriction - will rely on database constraint");
      } else {
        return NextResponse.redirect(
          `${getUrl("/dashboard", request)}?error=check_failed&message=${encodeURIComponent("Failed to verify Google Classroom connection")}`
        );
      }
    }

    // Check if any existing integration belongs to a different user
    if (existingIntegrations && existingIntegrations.length > 0) {
      const otherUserIntegration = existingIntegrations.find(
        (integration: any) => integration.user_id !== session.user.id
      );

      if (otherUserIntegration) {
        return NextResponse.redirect(
          `${getUrl("/dashboard", request)}?error=classroom_already_connected&message=${encodeURIComponent("This Google Classroom account is already connected. Please disconnect the existing connection first.")}`
        );
      }
    }

    // Final safety check before storing - prevent race conditions
    if (adminClient) {
      const { data: finalCheck } = await adminClient
        .from("google_classroom_integrations")
        .select("user_id")
        .eq("google_classroom_id", googleClassroomId)
        .neq("user_id", session.user.id)
        .maybeSingle();

      if (finalCheck) {
        return NextResponse.redirect(
          `${getUrl("/dashboard", request)}?error=classroom_already_connected&message=${encodeURIComponent("This Google Classroom account is already connected.")}`
        );
      }
    }

    // Store tokens in database
    // The unique constraint on google_classroom_id will prevent duplicates even if checks fail
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
      
      // Check if it's a unique constraint violation on google_classroom_id
      if (upsertError.code === '23505' && upsertError.message?.includes('google_classroom_id')) {
        return NextResponse.redirect(
          `${getUrl("/dashboard", request)}?error=classroom_already_connected&message=${encodeURIComponent("This Google Classroom account is already connected. Please disconnect the existing connection first.")}`
        );
      }
      
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

