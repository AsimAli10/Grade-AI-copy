import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/grades
 * Create a new grade (for manual grading)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      submission_id,
      overall_score,
      max_score,
      criterion_scores,
      teacher_notes,
      grade_status,
    } = body;

    // Validation
    if (!submission_id) {
      return NextResponse.json({ error: "submission_id is required" }, { status: 400 });
    }

    if (overall_score === undefined || max_score === undefined) {
      return NextResponse.json(
        { error: "overall_score and max_score are required" },
        { status: 400 }
      );
    }

    if (!criterion_scores || typeof criterion_scores !== "object") {
      return NextResponse.json(
        { error: "criterion_scores is required and must be an object" },
        { status: 400 }
      );
    }

    // Get user's profile to check role
    const { data: profile } = await (supabase
      .from("profiles") as any)
      .select("id, role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Only teachers and admins can create grades" },
        { status: 403 }
      );
    }

    // Verify submission exists and teacher has access
    const { data: submission } = await (supabase
      .from("submissions") as any)
      .select(`
        id,
        assignments:assignment_id (
          id,
          courses:course_id (
            id,
            teacher_id
          )
        )
      `)
      .eq("id", submission_id)
      .maybeSingle();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const assignment = (submission as any).assignments;
    const course = assignment?.courses;

    if (!course || (course.teacher_id !== session.user.id && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "You don't have permission to grade this submission" },
        { status: 403 }
      );
    }

    // Check if grade already exists
    const { data: existingGrade } = await (supabase
      .from("grades") as any)
      .select("id")
      .eq("submission_id", submission_id)
      .maybeSingle();

    if (existingGrade) {
      return NextResponse.json(
        { error: "Grade already exists for this submission. Use PATCH to update it." },
        { status: 400 }
      );
    }

    // Create the grade
    const { data: grade, error: insertError } = await (supabase
      .from("grades") as any)
      .insert({
        submission_id,
        overall_score: parseFloat(overall_score),
        max_score: parseFloat(max_score),
        criterion_scores,
        teacher_notes: teacher_notes || null,
        grade_status: grade_status || "teacher_reviewed",
        graded_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating grade:", insertError);
      return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      grade,
    });
  } catch (error: any) {
    console.error("Error in POST /api/grades:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create grade" },
      { status: 500 }
    );
  }
}

