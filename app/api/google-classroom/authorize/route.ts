import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";
import { getAuthorizationUrl } from "@/utils/google-classroom";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/google-classroom/authorize
 * Initiates Google OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get authenticated user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in first." },
        { status: 401 }
      );
    }

    // Generate authorization URL
    const authUrl = getAuthorizationUrl(session.user.id);

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Error initiating Google OAuth:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initiate Google OAuth" },
      { status: 500 }
    );
  }
}


