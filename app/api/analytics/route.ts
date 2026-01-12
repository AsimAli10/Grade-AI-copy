import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/analytics
 * Get analytics data for the authenticated teacher
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

    // Get user's courses
    const { data: courses } = await (supabase
      .from("courses") as any)
      .select("id, name")
      .eq("teacher_id", session.user.id);

    const courseIds = courses?.map((c: any) => c.id) || [];

    if (courseIds.length === 0) {
      return NextResponse.json({
        totalAssignments: 0,
        totalStudents: 0,
        averageGrade: 0,
        totalSubmissions: 0,
        completionRate: 0,
        topStudents: [],
        coursePerformance: [],
      });
    }

    // Get assignments
    const { data: assignments } = await (supabase
      .from("assignments") as any)
      .select("id, course_id, max_points")
      .in("course_id", courseIds);

    const assignmentIds = assignments?.map((a: any) => a.id) || [];

    // Get enrollments (students)
    const { data: enrollments } = await (supabase
      .from("course_enrollments") as any)
      .select("student_id")
      .in("course_id", courseIds);

    const uniqueStudentIds = [...new Set((enrollments || []).map((e: any) => e.student_id))];

    // Get submissions
    const { data: submissions } = await (supabase
      .from("submissions") as any)
      .select("id, assignment_id, student_id, status")
      .in("assignment_id", assignmentIds);

    const submissionIds = (submissions || []).map((s: any) => s.id);

    // Get grades
    const { data: grades } = await (supabase
      .from("grades") as any)
      .select("id, submission_id, overall_score, max_score")
      .in("submission_id", submissionIds);

    // Calculate metrics
    const totalAssignments = assignmentIds.length;
    const totalStudents = uniqueStudentIds.length;
    const totalSubmissions = submissions?.length || 0;

    // Calculate average grade
    let totalScore = 0;
    let totalMaxScore = 0;
    (grades || []).forEach((grade: any) => {
      totalScore += parseFloat(grade.overall_score || 0);
      totalMaxScore += parseFloat(grade.max_score || 100);
    });
    const averageGrade = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

    // Calculate completion rate
    const submittedCount = (submissions || []).filter(
      (s: any) => s.status === "submitted" || s.status === "graded"
    ).length;
    const expectedSubmissions = totalAssignments * totalStudents;
    const completionRate = expectedSubmissions > 0
      ? (submittedCount / expectedSubmissions) * 100
      : 0;

    // Get top students
    const studentScores = new Map<string, { totalScore: number; totalMaxScore: number; count: number }>();
    
    (grades || []).forEach((grade: any) => {
      const submission = (submissions || []).find((s: any) => s.id === grade.submission_id);
      if (submission) {
        const studentId = submission.student_id;
        if (!studentScores.has(studentId)) {
          studentScores.set(studentId, { totalScore: 0, totalMaxScore: 0, count: 0 });
        }
        const studentData = studentScores.get(studentId)!;
        studentData.totalScore += parseFloat(grade.overall_score || 0);
        studentData.totalMaxScore += parseFloat(grade.max_score || 100);
        studentData.count += 1;
      }
    });

    // Get student profiles for top performers
    const studentIds = Array.from(studentScores.keys());
    const { data: studentProfiles } = await (supabase
      .from("profiles") as any)
      .select("id, full_name, email")
      .in("id", studentIds);

    const topStudents = Array.from(studentScores.entries())
      .map(([studentId, data]) => {
        const avgGrade = data.totalMaxScore > 0
          ? (data.totalScore / data.totalMaxScore) * 100
          : 0;
        const profile = (studentProfiles || []).find((p: any) => p.id === studentId);
        return {
          studentId,
          name: profile?.full_name || profile?.email || "Unknown Student",
          grade: parseFloat(avgGrade.toFixed(1)),
          count: data.count,
        };
      })
      .sort((a, b) => b.grade - a.grade)
      .slice(0, 5)
      .map((student) => ({
        name: student.name,
        course: "Multiple Courses", // Could be enhanced to show primary course
        grade: student.grade,
        trend: "+0.0%", // Could be calculated from historical data
      }));

    // Calculate course performance
    const coursePerformance = (courses || []).map((course: any) => {
      const courseAssignments = (assignments || []).filter(
        (a: any) => a.course_id === course.id
      );
      const courseAssignmentIds = courseAssignments.map((a: any) => a.id);
      const courseSubmissions = (submissions || []).filter(
        (s: any) => courseAssignmentIds.includes(s.assignment_id)
      );
      const courseSubmissionIds = courseSubmissions.map((s: any) => s.id);
      const courseGrades = (grades || []).filter(
        (g: any) => courseSubmissionIds.includes(g.submission_id)
      );

      let courseTotalScore = 0;
      let courseTotalMaxScore = 0;
      courseGrades.forEach((grade: any) => {
        courseTotalScore += parseFloat(grade.overall_score || 0);
        courseTotalMaxScore += parseFloat(grade.max_score || 100);
      });
      const avgGrade = courseTotalMaxScore > 0
        ? (courseTotalScore / courseTotalMaxScore) * 100
        : 0;

      const courseEnrollments = (enrollments || []).filter(
        (e: any) => e.course_id === course.id
      );

      return {
        course: course.name,
        avgGrade: parseFloat(avgGrade.toFixed(1)),
        students: courseEnrollments.length,
        assignments: courseAssignments.length,
      };
    });

    return NextResponse.json({
      totalAssignments,
      totalStudents,
      averageGrade: parseFloat(averageGrade.toFixed(1)),
      totalSubmissions,
      completionRate: parseFloat(completionRate.toFixed(1)),
      topStudents,
      coursePerformance,
    });
  } catch (error: any) {
    console.error("Error in GET /api/analytics:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

