import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";

/**
 * POST /api/google-classroom/sync
 * Triggers sync from Google Classroom via edge function
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get authenticated user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get Supabase URL and anon key for edge function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get the user's access token
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token) {
      return NextResponse.json(
        { error: "Failed to get access token" },
        { status: 401 }
      );
    }

    // Call the edge function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/sync-from-gcr`;
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
          apikey: supabaseAnonKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to sync from Google Classroom" },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      return NextResponse.json(
        { 
          error: "Failed to call sync function",
          details: fetchError?.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to sync from Google Classroom" },
      { status: 500 }
    );
  }
}
