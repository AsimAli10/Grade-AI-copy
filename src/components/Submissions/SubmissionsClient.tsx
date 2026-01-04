"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Filter } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SubmissionsClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Fetch submissions with related data (assignment, course, student, grade)
      // First get the user's courses to filter submissions they can see
      const { data: userCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", session.user.id);

      const courseIds = userCourses?.map((c: any) => c.id) || [];

      if (courseIds.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // Fetch assignments from user's courses
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, title, course_id, max_points")
        .in("course_id", courseIds);

      const assignmentIds = assignments?.map((a: any) => a.id) || [];

      if (assignmentIds.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // Fetch submissions for these assignments
      const { data: submissionsData, error } = await supabase
        .from("submissions")
        .select(`
          id,
          status,
          submitted_at,
          assignment_id,
          student_id
        `)
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Error fetching submissions:", error);
        toast({
          title: "Error",
          description: "Failed to load submissions",
          variant: "destructive",
        });
        return;
      }

      // Fetch related data separately
      const allStudentIds = [...new Set((submissionsData || []).map((s: any) => s.student_id))];
      const allAssignmentIds = [...new Set((submissionsData || []).map((s: any) => s.assignment_id))];

      const [studentsData, assignmentsData, gradesData] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", allStudentIds),
        supabase.from("assignments").select("id, title, course_id, max_points").in("id", allAssignmentIds),
        supabase.from("grades").select("id, submission_id, score, max_score").in("submission_id", (submissionsData || []).map((s: any) => s.id)),
      ]);

      // Get courses for assignments
      const courseIdsForAssignments = [...new Set((assignmentsData.data || []).map((a: any) => a.course_id))];
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, name")
        .in("id", courseIdsForAssignments);

      // Create lookup maps
      const studentsMap = new Map((studentsData.data || []).map((s: any) => [s.id, s]));
      const assignmentsMap = new Map((assignmentsData.data || []).map((a: any) => [a.id, a]));
      const coursesMap = new Map((coursesData || []).map((c: any) => [c.id, c]));
      const gradesMap = new Map((gradesData.data || []).map((g: any) => [g.submission_id, g]));

      if (error) {
        console.error("Error fetching submissions:", error);
        toast({
          title: "Error",
          description: "Failed to load submissions",
          variant: "destructive",
        });
        return;
      }

      // Transform the data to match the component's expected format
      const transformedSubmissions = (submissionsData || []).map((sub: any) => {
        const assignment = assignmentsMap.get(sub.assignment_id) || {};
        const course = coursesMap.get(assignment.course_id) || {};
        const student = studentsMap.get(sub.student_id) || {};
        const grade = gradesMap.get(sub.id);
        
        const needsReview = sub.status === "submitted" || sub.status === "needs_review";
        const gradeDisplay = grade 
          ? `${grade.score}/${grade.max_score || assignment.max_points || 100}`
          : null;

        return {
          id: sub.id,
          studentName: student.full_name || student.email || "Unknown Student",
          studentId: sub.student_id,
          assignmentName: assignment.title || "Unknown Assignment",
          assignmentId: sub.assignment_id,
          courseName: course.name || "Unknown Course",
          courseId: assignment.course_id,
          grade: gradeDisplay,
          needsReview,
          status: sub.status,
          submittedAt: sub.submitted_at,
        };
      });

      setSubmissions(transformedSubmissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const needsReview = submissions.filter((s: any) => s.needsReview);

  if (loading) {
    return (
      <div className="w-full px-6 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Submissions</h1>
          <p className="text-muted-foreground text-lg">
            Review and grade student submissions
          </p>
        </div>
        <Button variant="outline" size="lg">
          <Filter className="h-4 w-4 mr-2" />
          Filter: Needs Review ({needsReview.length})
        </Button>
      </div>

      {submissions.length === 0 ? (
        <Card className="shadow-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No submissions yet</h3>
            <p className="text-muted-foreground text-center text-base">
              Submissions will appear here once students submit their work
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">All Submissions</CardTitle>
            <CardDescription className="text-base">Filter by status, course, or assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission: any) => (
                  <TableRow key={submission.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{submission.studentName}</TableCell>
                    <TableCell>{submission.assignmentName}</TableCell>
                    <TableCell>{submission.courseName}</TableCell>
                    <TableCell>{submission.grade || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={submission.needsReview ? "destructive" : "default"}>
                        {submission.needsReview ? "Needs Review" : "Graded"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/submissions/${submission.id}`}>Review</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

