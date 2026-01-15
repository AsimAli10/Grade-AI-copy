import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/forums/[id]/messages
 * Create a new message in a forum
 */
export async function POST(
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

    const forumId = params.id;
    const body = await request.json();
    const { content, parent_message_id } = body;

    // Validation
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Verify forum exists and user has access
    const { data: forum, error: forumError } = await (supabase
      .from("forums") as any)
      .select(`
        id,
        course_id,
        organization_id,
        courses:course_id (
          id,
          teacher_id,
          google_classroom_course_id
        )
      `)
      .eq("id", forumId)
      .maybeSingle();

    if (forumError || !forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    // Get user's profile to check access
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

    // Check access permissions
    if (forum.course_id) {
      // Course forum - check if user is teacher or enrolled student
      const course = (forum as any).courses;
      if (!course) {
        return NextResponse.json(
          { error: "Course not found" },
          { status: 404 }
        );
      }

      const isTeacher = course.teacher_id === session.user.id;
      const { data: enrollment } = await (supabase
        .from("course_enrollments") as any)
        .select("id")
        .eq("course_id", forum.course_id)
        .eq("student_id", session.user.id)
        .maybeSingle();

      if (!isTeacher && !enrollment && profile.role !== "admin") {
        return NextResponse.json(
          { error: "You don't have access to this forum" },
          { status: 403 }
        );
      }
    } else if (forum.organization_id) {
      // Organization forum - check if user belongs to organization
      if (
        profile.organization_id !== forum.organization_id &&
        profile.role !== "admin"
      ) {
        return NextResponse.json(
          { error: "You don't have access to this forum" },
          { status: 403 }
        );
      }
    }

    // If parent_message_id is provided, verify it exists and belongs to this forum
    if (parent_message_id) {
      const { data: parentMessage } = await (supabase
        .from("forum_messages") as any)
        .select("id, forum_id")
        .eq("id", parent_message_id)
        .eq("forum_id", forumId)
        .maybeSingle();

      if (!parentMessage) {
        return NextResponse.json(
          { error: "Parent message not found" },
          { status: 404 }
        );
      }
    }

    // Create the message
    let googleClassroomAnnouncementId: string | null = null;

    // If this is a top-level message (not a reply) and the forum is linked to a Google Classroom course,
    // post it as an announcement to Google Classroom
    if (!parent_message_id && forum.course_id) {
      const course = (forum as any).courses;
      if (course && course.google_classroom_course_id && course.teacher_id === session.user.id) {
        // Only teachers can post announcements to Google Classroom
        try {
          // Get Google Classroom integration for the teacher
          const { data: integration, error: intError } = await (supabase
            .from("google_classroom_integrations") as any)
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!intError && integration) {
            // Check if token is expired and refresh if needed
            let accessToken = integration.access_token;
            const tokenExpiresAt = new Date(integration.token_expires_at);
            const now = new Date();

            if (tokenExpiresAt <= now) {
              const { refreshAccessToken, getAuthenticatedClient, getClassroomClient } = await import("@/utils/google-classroom");
              const refreshed = await refreshAccessToken(integration.refresh_token);
              accessToken = refreshed.access_token;

              // Update stored token
              await (supabase
                .from("google_classroom_integrations") as any)
                .update({
                  access_token: refreshed.access_token,
                  token_expires_at: new Date(refreshed.expiry_date).toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", session.user.id);
            }

            // Create announcement in Google Classroom
            const { getAuthenticatedClient, getClassroomClient } = await import("@/utils/google-classroom");
            const oauth2Client = getAuthenticatedClient(
              accessToken,
              integration.refresh_token
            );
            const classroom = getClassroomClient(oauth2Client);

            const announcementResponse = await classroom.courses.announcements.create({
              courseId: course.google_classroom_course_id,
              requestBody: {
                text: content.trim(),
                state: 'PUBLISHED',
              },
            });

            if (announcementResponse.data && announcementResponse.data.id) {
              googleClassroomAnnouncementId = announcementResponse.data.id;
            }
          }
        } catch (gcError: any) {
          // Log error but don't fail the message creation
          console.error("Error posting to Google Classroom:", gcError);
          // Continue with message creation even if GC post fails
        }
      }
    }

    const { data: message, error: insertError } = await (supabase
      .from("forum_messages") as any)
      .insert({
        forum_id: forumId,
        author_id: session.user.id,
        content: content.trim(),
        parent_message_id: parent_message_id || null,
        is_pinned: false,
        pinned_rubric_id: null,
        google_classroom_announcement_id: googleClassroomAnnouncementId,
      })
      .select(`
        *,
        author:author_id (
          id,
          full_name,
          email
        )
      `)
      .single();

    if (insertError) {
      console.error("Error creating message:", insertError);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
      postedToGoogleClassroom: !!googleClassroomAnnouncementId,
    });
  } catch (error: any) {
    console.error("Error in POST /api/forums/[id]/messages:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create message" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/forums/[id]/messages
 * Get all messages for a forum (with threading)
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

    const forumId = params.id;

    // Verify forum exists and user has access
    const { data: forum } = await (supabase
      .from("forums") as any)
      .select(`
        id,
        course_id,
        organization_id,
        courses:course_id (
          id,
          teacher_id
        )
      `)
      .eq("id", forumId)
      .maybeSingle();

    if (!forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    // Get user's profile to check access
    const { data: profile } = await (supabase
      .from("profiles") as any)
      .select("id, role, organization_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access permissions (same logic as POST)
    if (forum.course_id) {
      const course = (forum as any).courses;
      if (course) {
        const isTeacher = course.teacher_id === session.user.id;
        const { data: enrollment } = await (supabase
          .from("course_enrollments") as any)
          .select("id")
          .eq("course_id", forum.course_id)
          .eq("student_id", session.user.id)
          .maybeSingle();

        if (!isTeacher && !enrollment && profile.role !== "admin") {
          return NextResponse.json(
            { error: "You don't have access to this forum" },
            { status: 403 }
          );
        }
      }
    } else if (forum.organization_id) {
      if (
        profile.organization_id !== forum.organization_id &&
        profile.role !== "admin"
      ) {
        return NextResponse.json(
          { error: "You don't have access to this forum" },
          { status: 403 }
        );
      }
    }

    // Fetch all messages for this forum with author profiles
    const { data: messages, error: messagesError } = await (supabase
      .from("forum_messages") as any)
      .select(`
        *,
        author:author_id (
          id,
          full_name,
          email,
          google_classroom_id
        )
      `)
      .eq("forum_id", forumId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Organize messages into threads (top-level messages and their replies)
    const topLevelMessages = (messages || []).filter(
      (msg: any) => !msg.parent_message_id
    );
    const replies = (messages || []).filter(
      (msg: any) => msg.parent_message_id
    );

    // Group replies by parent
    const repliesByParent = new Map<string, any[]>();
    replies.forEach((reply: any) => {
      const parentId = reply.parent_message_id;
      if (!repliesByParent.has(parentId)) {
        repliesByParent.set(parentId, []);
      }
      repliesByParent.get(parentId)!.push(reply);
    });

    // Attach replies to their parent messages
    const messagesWithReplies = topLevelMessages.map((message: any) => ({
      ...message,
      replies: repliesByParent.get(message.id) || [],
    }));

    return NextResponse.json({
      messages: messagesWithReplies,
      totalMessages: messages?.length || 0,
    });
  } catch (error: any) {
    console.error("Error in GET /api/forums/[id]/messages:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

