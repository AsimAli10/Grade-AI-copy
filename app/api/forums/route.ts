import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/forums
 * Get all forums accessible to the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
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

    // Get user's profile to check organization and role
    const { data: profile } = await (supabase
      .from("profiles") as any)
      .select("id, role, organization_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ forums: [] });
    }

    // Get user's courses (as teacher or student)
    const { data: teacherCourses } = await (supabase
      .from("courses") as any)
      .select("id")
      .eq("teacher_id", session.user.id);

    const { data: studentEnrollments } = await (supabase
      .from("course_enrollments") as any)
      .select("course_id")
      .eq("student_id", session.user.id);

    const teacherCourseIds = teacherCourses?.map((c: any) => c.id) || [];
    const studentCourseIds = studentEnrollments?.map((e: any) => e.course_id) || [];
    const allCourseIds = [...new Set([...teacherCourseIds, ...studentCourseIds])];

    // Fetch forums - organization-level or course-level
    let forumsQuery = (supabase
      .from("forums") as any)
      .select(`
        id,
        name,
        description,
        is_public,
        created_at,
        organization_id,
        course_id,
        courses:course_id (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });

    // Apply filters based on user access
    if (profile.role === "admin" && profile.organization_id) {
      // Admins can see all org forums
      forumsQuery = forumsQuery.eq("organization_id", profile.organization_id);
    } else {
      // Teachers and students can see course forums they're part of
      if (allCourseIds.length > 0) {
        forumsQuery = forumsQuery.in("course_id", allCourseIds);
      } else {
        forumsQuery = forumsQuery.eq("course_id", "00000000-0000-0000-0000-000000000000"); // No access
      }
    }

    const { data: forums, error } = await forumsQuery;

    if (error) {
      console.error("Error fetching forums:", error);
      return NextResponse.json(
        { error: "Failed to fetch forums" },
        { status: 500 }
      );
    }

    // Get message counts for each forum
    const forumIds = forums || [];
    const messageCounts = new Map<string, number>();

    if (forumIds.length > 0) {
      const { data: messages } = await (supabase
        .from("forum_messages") as any)
        .select("forum_id")
        .in("forum_id", forumIds.map((f: any) => f.id));

      (messages || []).forEach((msg: any) => {
        messageCounts.set(msg.forum_id, (messageCounts.get(msg.forum_id) || 0) + 1);
      });
    }

    // Transform data
    const transformedForums = (forums || []).map((forum: any) => ({
      id: forum.id,
      name: forum.name,
      courseName: forum.courses?.name || "Organization Forum",
      courseId: forum.course_id,
      threadsCount: messageCounts.get(forum.id) || 0,
      pinned: false, // Could be enhanced with pinned field
      lastActivity: forum.created_at,
    }));

    return NextResponse.json({ forums: transformedForums });
  } catch (error: any) {
    console.error("Error in GET /api/forums:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch forums" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forums
 * Create a new forum
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
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

    const body = await request.json();
    const { name, description, course_id, organization_id } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Forum name is required" },
        { status: 400 }
      );
    }

    // Get user's profile
    const { data: profile } = await (supabase
      .from("profiles") as any)
      .select("id, role, organization_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Verify course access if course_id is provided
    if (course_id) {
      const { data: course } = await (supabase
        .from("courses") as any)
        .select("id, teacher_id")
        .eq("id", course_id)
        .maybeSingle();

      if (!course || (course.teacher_id !== session.user.id && profile.role !== "admin")) {
        return NextResponse.json(
          { error: "Course not found or access denied" },
          { status: 403 }
        );
      }
    }

    // Use organization_id from profile if not provided
    const finalOrgId = organization_id || profile.organization_id;

    const { data: forum, error: insertError } = await (supabase
      .from("forums") as any)
      .insert({
        name,
        description: description || null,
        course_id: course_id || null,
        organization_id: finalOrgId,
        is_public: true,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating forum:", insertError);
      return NextResponse.json(
        { error: "Failed to create forum" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      forum: {
        id: forum.id,
        name: forum.name,
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/forums:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create forum" },
      { status: 500 }
    );
  }
}

