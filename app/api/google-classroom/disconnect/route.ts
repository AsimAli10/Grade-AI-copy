import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DELETE /api/google-classroom/disconnect
 * Triggers disconnect from Google Classroom via edge function
 */
export async function DELETE(request: NextRequest) {
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
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/disconnect-gcr`;
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
          apikey: supabaseAnonKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to disconnect Google Classroom" },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      return NextResponse.json(
        { 
          error: "Failed to call disconnect function",
          details: fetchError?.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to disconnect Google Classroom" },
      { status: 500 }
    );
  }
}
