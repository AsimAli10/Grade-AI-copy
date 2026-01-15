import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * POST /api/google-classroom/sync-back
 * Triggers sync of grades back to Google Classroom via edge function
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
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

    // Parse request body
    const body = await request.json();
    const { submissionId, assignmentId, courseId } = body;

    if (!submissionId || !assignmentId) {
      return NextResponse.json(
        { error: "Missing submissionId or assignmentId" },
        { status: 400 }
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
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/sync-grades-to-gcr`;
    
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          submissionId,
          assignmentId,
          courseId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Edge function error:", data);
        return NextResponse.json(
          { 
            error: data.error || "Failed to sync grade to Google Classroom",
            details: data.details,
          },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      console.error("Error calling edge function:", fetchError);
      return NextResponse.json(
        { 
          error: "Failed to call sync function",
          details: fetchError?.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error syncing grade to Google Classroom:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sync grade to Google Classroom" },
      { status: 500 }
    );
  }
}

