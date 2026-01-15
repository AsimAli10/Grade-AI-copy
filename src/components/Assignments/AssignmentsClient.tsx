"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AssignmentCreator } from "./AssignmentCreator";

export default function AssignmentsClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Get user's active courses first (exclude inactive/deleted courses)
      const { data: userCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", session.user.id)
        .eq("is_active", true);

      const courseIds = userCourses?.map((c: any) => c.id) || [];

      if (courseIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Fetch assignments from user's active courses
      // Also filter to ensure the course still exists and is active
      const { data: assignmentsData, error } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          description,
          max_points,
          due_date,
          assignment_type,
          sync_status,
          course_id,
          courses:course_id (
            id,
            name,
            is_active
          )
        `)
        .in("course_id", courseIds)
        .order("due_date", { ascending: true });

      if (error) {
        console.error("Error fetching assignments:", error);
        toast({
          title: "Error",
          description: "Failed to load assignments",
          variant: "destructive",
        });
        return;
      }

      // Filter out assignments from inactive or deleted courses
      const validAssignments = (assignmentsData || []).filter((assignment: any) => {
        const course = assignment.courses;
        return course && course.is_active !== false;
      });

      // Fetch submission counts for each assignment
      const assignmentsWithCounts = await Promise.all(
        validAssignments.map(async (assignment: any) => {
          const { count } = await supabase
            .from("submissions")
            .select("*", { count: "exact", head: true })
            .eq("assignment_id", assignment.id);

          const { data: submissions } = await supabase
            .from("submissions")
            .select("id")
            .eq("assignment_id", assignment.id);

          const submissionIds = submissions?.map((s: any) => s.id) || [];
          
          const { count: gradedCount } = submissionIds.length > 0
            ? await supabase
                .from("grades")
                .select("*", { count: "exact", head: true })
                .in("submission_id", submissionIds)
            : { count: 0 };

          const submissionsCount = count || 0;
          const gradedSubmissions = gradedCount || 0;
          const aiGradedPercent = submissionsCount > 0 
            ? Math.round((gradedSubmissions / submissionsCount) * 100) 
            : 0;

          const course = assignment.courses || {};

          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            courseName: course.name || "Unknown Course",
            courseId: assignment.course_id,
            maxPoints: assignment.max_points,
            dueDate: assignment.due_date,
            submissionsCount,
            aiGradedPercent,
            status: assignment.sync_status === "synced" ? "graded" : "in_progress",
            assignmentType: assignment.assignment_type,
          };
        })
      );

      setAssignments(assignmentsWithCounts);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-4xl font-bold tracking-tight mb-2">Assignments</h1>
          <p className="text-muted-foreground text-lg">Manage all assignments across courses</p>
        </div>
        <Button size="lg" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card className="shadow-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No assignments yet</h3>
            <p className="text-muted-foreground text-center mb-6 text-base">
              Create your first assignment to get started
            </p>
            <Button size="lg" onClick={() => setIsDialogOpen(true)}>Create Assignment</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment: any) => (
            <Card key={assignment.id} className="cursor-pointer hover:shadow-md transition-all border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{assignment.title}</CardTitle>
                    <CardDescription className="text-base mt-1">{assignment.courseName}</CardDescription>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span>{assignment.submissionsCount} submissions</span>
                      <span>•</span>
                      <span>Max: {assignment.maxPoints} pts</span>
                    </div>
                  </div>
                  <Badge variant={assignment.status === "graded" ? "default" : "secondary"} className="ml-2">
                    {assignment.aiGradedPercent}% AI Graded
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "No due date"}
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/assignments/${assignment.id}`}>View Assignment</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssignmentCreator
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchAssignments}
      />
    </div>
  );
}

