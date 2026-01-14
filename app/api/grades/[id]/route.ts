import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH /api/grades/[id]
 * Update a grade (for teacher editing)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gradeId = params.id;
    const body = await request.json();

    // Get user's profile to check role
    const { data: profile } = await (supabase
      .from("profiles") as any)
      .select("id, role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Only teachers and admins can edit grades" },
        { status: 403 }
      );
    }

    // Fetch existing grade to get previous values for history
    const { data: existingGrade, error: fetchError } = await (supabase
      .from("grades") as any)
      .select("*")
      .eq("id", gradeId)
      .maybeSingle();

    if (fetchError || !existingGrade) {
      return NextResponse.json({ error: "Grade not found" }, { status: 404 });
    }

    // Verify teacher has access to this grade (through submission -> assignment -> course)
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
      .eq("id", existingGrade.submission_id)
      .maybeSingle();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const assignment = (submission as any).assignments;
    const course = assignment?.courses;
    
    if (!course || (course.teacher_id !== session.user.id && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "You don't have permission to edit this grade" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Track what changed for history
    const changes: string[] = [];
    const previousScore = existingGrade.overall_score;
    const previousMaxScore = existingGrade.max_score;
    const previousCriterionScores = existingGrade.criterion_scores || {};

    // Update overall score if provided
    if (body.overall_score !== undefined) {
      updateData.overall_score = parseFloat(body.overall_score);
      if (updateData.overall_score !== previousScore) {
        changes.push(`Overall score: ${previousScore} → ${updateData.overall_score}`);
      }
    }

    // Update max score if provided
    if (body.max_score !== undefined) {
      updateData.max_score = parseFloat(body.max_score);
      if (updateData.max_score !== previousMaxScore) {
        changes.push(`Max score: ${previousMaxScore} → ${updateData.max_score}`);
      }
    }

    // Update criterion scores if provided
    if (body.criterion_scores !== undefined) {
      updateData.criterion_scores = body.criterion_scores;
      const newCriterionScores = body.criterion_scores;
      const criterionChanges: string[] = [];
      
      // Check for changes in criterion scores
      Object.keys(newCriterionScores).forEach((key) => {
        const oldValue = previousCriterionScores[key];
        const newValue = newCriterionScores[key];
        if (oldValue !== newValue) {
          criterionChanges.push(`${key}: ${oldValue || 0} → ${newValue}`);
        }
      });
      
      if (criterionChanges.length > 0) {
        changes.push(`Criterion scores: ${criterionChanges.join(", ")}`);
      }
    }

    // Update teacher notes if provided
    if (body.teacher_notes !== undefined) {
      updateData.teacher_notes = body.teacher_notes || null;
      if (body.teacher_notes !== existingGrade.teacher_notes) {
        changes.push("Teacher notes updated");
      }
    }

    // Update grade status
    if (body.grade_status !== undefined) {
      updateData.grade_status = body.grade_status;
      if (body.grade_status !== existingGrade.grade_status) {
        changes.push(`Status: ${existingGrade.grade_status} → ${body.grade_status}`);
      }
    }

    // Update flagged_for_review if provided
    if (body.flagged_for_review !== undefined) {
      updateData.flagged_for_review = body.flagged_for_review;
      if (body.flagged_for_review !== existingGrade.flagged_for_review) {
        changes.push(body.flagged_for_review ? "Flagged for review" : "Unflagged");
      }
    }

    // Update flag_reason if provided
    if (body.flag_reason !== undefined) {
      updateData.flag_reason = body.flag_reason || null;
    }

    // Set graded_by to current user
    updateData.graded_by = session.user.id;

    // If grade was modified (not just notes), update status to teacher_reviewed or modified
    if (body.overall_score !== undefined || body.criterion_scores !== undefined) {
      if (existingGrade.grade_status === "ai_graded") {
        updateData.grade_status = "teacher_reviewed";
      } else {
        updateData.grade_status = "modified";
      }
    }

    // Update the grade
    const { data: updatedGrade, error: updateError } = await (supabase
      .from("grades") as any)
      .update(updateData)
      .eq("id", gradeId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating grade:", updateError);
      return NextResponse.json({ error: "Failed to update grade" }, { status: 500 });
    }

    // Create grade history entry if there were changes
    if (changes.length > 0) {
      const newScore = updateData.overall_score !== undefined 
        ? updateData.overall_score 
        : previousScore;
      
      const { error: historyError } = await (supabase
        .from("grade_history") as any)
        .insert({
          grade_id: gradeId,
          action: "grade_updated",
          previous_score: previousScore,
          new_score: newScore,
          changed_by: session.user.id,
          notes: changes.join("; "),
        });

      if (historyError) {
        console.error("Error creating grade history:", historyError);
        // Don't fail the request if history creation fails
      }
    }

    return NextResponse.json({
      success: true,
      grade: updatedGrade,
    });
  } catch (error: any) {
    console.error("Error in PATCH /api/grades/[id]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update grade" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grades/[id]
 * Get a specific grade with history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gradeId = params.id;

    // Fetch grade
    const { data: grade, error: gradeError } = await (supabase
      .from("grades") as any)
      .select("*")
      .eq("id", gradeId)
      .maybeSingle();

    if (gradeError || !grade) {
      return NextResponse.json({ error: "Grade not found" }, { status: 404 });
    }

    // Fetch grade history
    const { data: history, error: historyError } = await (supabase
      .from("grade_history") as any)
      .select(`
        *,
        changed_by_profile:changed_by (
          id,
          full_name,
          email
        )
      `)
      .eq("grade_id", gradeId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      grade,
      history: history || [],
    });
  } catch (error: any) {
    console.error("Error in GET /api/grades/[id]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch grade" },
      { status: 500 }
    );
  }
}

