import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/rubrics
 * Get all rubrics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's profile to check organization
    const { data: profile } = await (supabase
      .from("profiles") as any)
      .select("id, role, organization_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ rubrics: [] });
    }

    // Build query - users can see rubrics they created or organization rubrics
    let rubricsQuery = (supabase
      .from("rubrics") as any)
      .select("*")
      .order("created_at", { ascending: false });

    // Filter: user's own rubrics OR organization rubrics (if user has org)
    if (profile.organization_id) {
      rubricsQuery = rubricsQuery.or(
        `created_by.eq.${session.user.id},organization_id.eq.${profile.organization_id}`
      );
    } else {
      rubricsQuery = rubricsQuery.eq("created_by", session.user.id);
    }

    const { data: rubrics, error } = await rubricsQuery;

    if (error) {
      console.error("Error fetching rubrics:", error);
      return NextResponse.json({ error: "Failed to fetch rubrics" }, { status: 500 });
    }

    return NextResponse.json({ rubrics: rubrics || [] });
  } catch (error: any) {
    console.error("Error in GET /api/rubrics:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch rubrics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rubrics
 * Create a new rubric
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

    // Get user's profile for organization_id
    const { data: profile } = await (supabase
      .from("profiles") as any)
      .select("id, organization_id")
      .eq("id", session.user.id)
      .maybeSingle();

    const { data: rubric, error: insertError } = await (supabase
      .from("rubrics") as any)
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        total_points: total_points || 100,
        is_template: is_template || false,
        criteria: criteria,
        created_by: session.user.id,
        organization_id: profile?.organization_id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating rubric:", insertError);
      return NextResponse.json({ error: "Failed to create rubric" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rubric: {
        id: rubric.id,
        name: rubric.name,
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/rubrics:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create rubric" },
      { status: 500 }
    );
  }
}

