import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DELETE /api/google-classroom/disconnect
 * Disconnects Google Classroom integration for the current user
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

    // Delete the Google Classroom integration
    const { error: deleteError } = await (supabase
      .from("google_classroom_integrations") as any)
      .delete()
      .eq("user_id", session.user.id);

    if (deleteError) {
      console.error("Error disconnecting Google Classroom:", deleteError);
      return NextResponse.json(
        { error: "Failed to disconnect Google Classroom" },
        { status: 500 }
      );
    }

    // Clear google_classroom_id from profile (optional, but good practice)
    await (supabase
      .from("profiles") as any)
      .update({
        google_classroom_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    return NextResponse.json({
      success: true,
      message: "Google Classroom disconnected successfully",
    });
  } catch (error: any) {
    console.error("Error disconnecting Google Classroom:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to disconnect Google Classroom" },
      { status: 500 }
    );
  }
}

