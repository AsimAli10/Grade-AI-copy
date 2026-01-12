"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, RefreshCw, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type AssignmentDetailClientProps = {
  assignmentId: string;
};

export default function AssignmentDetailClient({ assignmentId }: AssignmentDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignmentData();
  }, [assignmentId]);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Fetch assignment with course info and rubric
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          description,
          course_id,
          max_points,
          rubric_id,
          courses:course_id (
            id,
            name
          ),
          rubrics:rubric_id (
            id,
            name,
            description,
            criteria,
            total_points
          )
        `)
        .eq("id", assignmentId)
        .single();

      if (assignmentError || !assignmentData) {
        console.error("Error fetching assignment:", assignmentError);
        toast({
          title: "Error",
          description: "Failed to load assignment",
          variant: "destructive",
        });
        return;
      }

      setAssignment(assignmentData);

      // Fetch submissions for this assignment
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select(`
          id,
          status,
          submitted_at,
          student_id
        `)
        .eq("assignment_id", assignmentId)
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.error("Error fetching submissions:", submissionsError);
        console.error("Submission error details:", {
          code: submissionsError.code,
          message: submissionsError.message,
          details: submissionsError.details,
          hint: submissionsError.hint,
        });
        toast({
          title: "Error",
          description: `Failed to load submissions: ${submissionsError.message}. This might be an RLS (Row Level Security) issue.`,
          variant: "destructive",
        });
        setSubmissions([]);
        setLoading(false);
        return;
      }

      if (!submissionsData || submissionsData.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // Fetch student and grade data
      const studentIds = [...new Set(submissionsData.map((s: any) => s.student_id))];
      const submissionIds = submissionsData.map((s: any) => s.id);

      const [studentsResult, gradesResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", studentIds),
        supabase.from("grades").select("id, submission_id, overall_score, max_score, ai_confidence").in("submission_id", submissionIds),
      ]);

      if (studentsResult.error) {
        console.error("Error fetching student profiles:", studentsResult.error);
        toast({
          title: "Warning",
          description: `Failed to load student profiles: ${studentsResult.error.message}. This is likely an RLS (Row Level Security) issue. Please run the migration: 20250101000004_fix_profile_rls_for_teachers.sql`,
          variant: "destructive",
        });
      }

      const studentsMap = new Map((studentsResult.data || []).map((s: any) => [s.id, s]));
      const gradesMap = new Map((gradesResult.data || []).map((g: any) => [g.submission_id, g]));

      // Extract max_points from assignmentData
      const assignmentMaxPoints = (assignmentData as any)?.max_points || 100;

      // Transform submissions
      const transformedSubmissions = submissionsData.map((sub: any) => {
        const student = studentsMap.get(sub.student_id) || {};
        const grade = gradesMap.get(sub.id);

        return {
          id: sub.id,
          studentName: student.full_name || student.email || "Unknown Student",
          grade: grade ? `${grade.overall_score}/${grade.max_score || assignmentMaxPoints}` : null,
          confidence: grade?.ai_confidence || null,
          lastActivity: sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—",
          status: sub.status,
        };
      });

      setSubmissions(transformedSubmissions);
    } catch (error) {
      console.error("Error fetching assignment data:", error);
      toast({
        title: "Error",
        description: "Failed to load assignment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-xl font-semibold mb-2">Assignment not found</h3>
            <p className="text-muted-foreground text-center text-base">
              The assignment you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const course = assignment.courses || {};

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">{assignment.title || "Untitled Assignment"}</h1>
            <p className="text-muted-foreground mt-1">Course: {course.name || "Unknown Course"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Rubric
            </Button>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Bulk Regrade
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
        <Badge variant="outline">Sync Status: Synced</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>Student submissions for this assignment</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No submissions yet</h3>
                  <p className="text-muted-foreground text-center text-base">
                    Submissions will appear here once students submit their work
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission: any) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.studentName}</TableCell>
                        <TableCell>{submission.grade || "—"}</TableCell>
                        <TableCell>
                          {submission.confidence ? (
                            <Badge variant={submission.confidence === "high" ? "default" : submission.confidence === "medium" ? "secondary" : "outline"}>
                              {submission.confidence === "high" ? "High" : submission.confidence === "medium" ? "Medium" : "Low"}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{submission.lastActivity}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/submissions/${submission.id}`}>Review</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Rubric</CardTitle>
              <CardDescription>Grading criteria</CardDescription>
            </CardHeader>
            <CardContent>
              {assignment.rubrics ? (
                <div className="space-y-4">
                  {assignment.rubrics.description && (
                    <p className="text-sm text-muted-foreground">{assignment.rubrics.description}</p>
                  )}
                  <div className="space-y-3">
                    {Array.isArray(assignment.rubrics.criteria) && assignment.rubrics.criteria.map((criterion: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{criterion.name || `Criterion ${idx + 1}`}</h4>
                            {criterion.description && (
                              <p className="text-xs text-muted-foreground mt-1">{criterion.description}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {criterion.max_points || criterion.weight || 0} pts
                          </Badge>
                        </div>
                        {criterion.levels && Array.isArray(criterion.levels) && criterion.levels.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {criterion.levels.map((level: any, levelIdx: number) => (
                              <div key={levelIdx} className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
                                <span className="font-medium">{level.name || `Level ${levelIdx + 1}`}</span>
                                {level.points !== undefined && (
                                  <span className="ml-2">({level.points} pts)</span>
                                )}
                                {level.description && (
                                  <p className="mt-0.5 text-muted-foreground/80">{level.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium">
                      Total Points: <span className="text-primary">{assignment.rubrics.total_points || assignment.max_points || 100}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-4">No rubric assigned to this assignment</p>
                  <Button variant="outline" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Add Rubric
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


