import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PUT /api/rubrics/[id]
 * Update an existing rubric
 */
export async function PUT(
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

    const rubricId = params.id;
    const body = await request.json();
    const { name, description, total_points, is_template, criteria } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Rubric name is required" }, { status: 400 });
    }

    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json(
        { error: "At least one criterion is required" },
        { status: 400 }
      );
    }

    // Validate criteria
    for (let i = 0; i < criteria.length; i++) {
      const criterion = criteria[i];
      if (!criterion.name || !criterion.name.trim()) {
        return NextResponse.json(
          { error: `Criterion ${i + 1}: name is required` },
          { status: 400 }
        );
      }
      if (!criterion.description || !criterion.description.trim()) {
        return NextResponse.json(
          { error: `Criterion ${i + 1}: description is required` },
          { status: 400 }
        );
      }
      if (criterion.weight === undefined || criterion.weight < 0 || criterion.weight > 100) {
        return NextResponse.json(
          { error: `Criterion ${i + 1}: weight must be between 0 and 100` },
          { status: 400 }
        );
      }
    }

    // Check if rubric exists and user has permission to update it
    const { data: existingRubric, error: fetchError } = await (supabase
      .from("rubrics") as any)
      .select("id, created_by, organization_id")
      .eq("id", rubricId)
      .maybeSingle();

    if (fetchError || !existingRubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    // Check permissions: user must be the creator or admin of the organization
    if (existingRubric.created_by !== session.user.id) {
      // Check if user is admin of the organization
      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("id, role, organization_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (
        profile?.role !== "admin" ||
        profile?.organization_id !== existingRubric.organization_id
      ) {
        return NextResponse.json(
          { error: "You don't have permission to update this rubric" },
          { status: 403 }
        );
      }
    }

    // Update the rubric
    const { data: rubric, error: updateError } = await (supabase
      .from("rubrics") as any)
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        total_points: total_points || 100,
        is_template: is_template || false,
        criteria: criteria,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rubricId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating rubric:", updateError);
      return NextResponse.json({ error: "Failed to update rubric" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rubric: {
        id: rubric.id,
        name: rubric.name,
      },
    });
  } catch (error: any) {
    console.error("Error in PUT /api/rubrics/[id]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update rubric" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rubrics/[id]
 * Get a specific rubric by ID
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

    const rubricId = params.id;

    const { data: rubric, error } = await (supabase
      .from("rubrics") as any)
      .select("*")
      .eq("id", rubricId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching rubric:", error);
      return NextResponse.json({ error: "Failed to fetch rubric" }, { status: 500 });
    }

    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    // Check permissions: user must be the creator or have access via organization
    if (rubric.created_by !== session.user.id) {
      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("id, role, organization_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (
        profile?.role !== "admin" ||
        profile?.organization_id !== rubric.organization_id
      ) {
        return NextResponse.json(
          { error: "You don't have permission to view this rubric" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ rubric });
  } catch (error: any) {
    console.error("Error in GET /api/rubrics/[id]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch rubric" },
      { status: 500 }
    );
  }
}

