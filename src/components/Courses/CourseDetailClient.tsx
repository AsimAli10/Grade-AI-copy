"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Users, BarChart3, MessageSquare, Plus, TrendingUp, FileText, Clock, Pin } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CourseDetailClientProps = {
  courseId: string;
};

export default function CourseDetailClient({ courseId }: CourseDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Fetch course data
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError || !courseData) {
        console.error("Error fetching course:", courseError);
        toast({
          title: "Error",
          description: "Failed to load course",
          variant: "destructive",
        });
        return;
      }

      setCourse(courseData);

      // Fetch assignments for this course
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, title, description, max_points, due_date, assignment_type, sync_status")
        .eq("course_id", courseId)
        .order("due_date", { ascending: true });

      let processedAssignments: any[] = [];
      if (!assignmentsError && assignmentsData) {
        // Fetch submission counts for each assignment
        processedAssignments = await Promise.all(
          assignmentsData.map(async (assignment: any) => {
            const { count } = await supabase
              .from("submissions")
              .select("*", { count: "exact", head: true })
              .eq("assignment_id", assignment.id);

            // Get submission IDs first
            const { data: submissionsData } = await supabase
              .from("submissions")
              .select("id")
              .eq("assignment_id", assignment.id);

            const submissionIds = submissionsData?.map((s: any) => s.id) || [];
            
            let gradedCount = 0;
            if (submissionIds.length > 0) {
              const { count: gradedCountResult } = await supabase
                .from("grades")
                .select("*", { count: "exact", head: true })
                .in("submission_id", submissionIds);
              gradedCount = gradedCountResult || 0;
            }

            const submissionsCount = count || 0;
            const gradedSubmissions = gradedCount || 0;
            const aiGradedPercent = submissionsCount > 0 
              ? Math.round((gradedSubmissions / submissionsCount) * 100) 
              : 0;

            return {
              id: assignment.id,
              title: assignment.title,
              description: assignment.description,
              maxPoints: assignment.max_points,
              dueDate: assignment.due_date,
              submissionsCount,
              aiGradedPercent,
              status: assignment.sync_status === "synced" ? "graded" : "in_progress",
            };
          })
        );
        setAssignments(processedAssignments);
      } else if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError);
      }

      // Fetch enrolled students
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("course_enrollments")
        .select(`
          student_id,
          profiles:student_id (
            id,
            full_name,
            email
          )
        `)
        .eq("course_id", courseId);

      if (enrollmentsError) {
        console.error("Error fetching students:", enrollmentsError);
      } else if (enrollments) {
        // Fetch submission counts and grades for each student
        const assignmentIds = assignmentsData?.map((a: any) => a.id) || [];
        const studentsWithData = await Promise.all(
          enrollments.map(async (enrollment: any) => {
            const student = enrollment.profiles || {};
            
            // Count submissions for this student in this course
            let count = 0;
            if (assignmentIds.length > 0) {
              const { count: submissionCount } = await supabase
                .from("submissions")
                .select("*", { count: "exact", head: true })
                .eq("student_id", student.id)
                .in("assignment_id", assignmentIds);
              count = submissionCount || 0;
            }

            // Calculate average grade (simplified - you might want to improve this)
            return {
              id: student.id,
              name: student.full_name || student.email || "Unknown Student",
              email: student.email || "",
              grade: "—", // Would need to calculate from grades table
              submissions: count || 0,
            };
          })
        );

        setStudents(studentsWithData);

        // Calculate analytics from grades
        if (assignmentsData && assignmentsData.length > 0 && enrollments) {
          const assignmentIds = assignmentsData.map((a: any) => a.id);
          
          // Fetch all submissions for these assignments
          const { data: allSubmissions } = await supabase
            .from("submissions")
            .select("id, student_id")
            .in("assignment_id", assignmentIds);

          const submissionIds = (allSubmissions || []).map((s: any) => s.id);

          if (submissionIds.length > 0) {
            // Fetch all grades for these submissions
            const { data: allGrades } = await supabase
              .from("grades")
              .select("id, submission_id, score, max_score")
              .in("submission_id", submissionIds);

            // Calculate average grade
            let totalScore = 0;
            let totalMaxScore = 0;
            const studentGrades = new Map<string, { totalScore: number; totalMaxScore: number; count: number }>();

            allGrades?.forEach((grade: any) => {
              const score = grade.score || 0;
              const maxScore = grade.max_score || 100;
              
              totalScore += score;
              totalMaxScore += maxScore;

              // Find which student this grade belongs to
              const submission = (allSubmissions || []).find((s: any) => s.id === grade.submission_id);
              if (submission) {
                const studentId = (submission as any).student_id;
                if (!studentGrades.has(studentId)) {
                  studentGrades.set(studentId, { totalScore: 0, totalMaxScore: 0, count: 0 });
                }
                const studentData = studentGrades.get(studentId)!;
                studentData.totalScore += score;
                studentData.totalMaxScore += maxScore;
                studentData.count += 1;
              }
            });

            const averageGrade = totalMaxScore > 0 
              ? Math.round((totalScore / totalMaxScore) * 100 * 10) / 10 
              : 0;

            // Find top performer and students needing attention
            let topPerformerName = "—";
            let topPerformerGrade = 0;
            const needsAttentionNames: string[] = [];

            studentGrades.forEach((data, studentId) => {
              const studentAverage = data.totalMaxScore > 0 
                ? (data.totalScore / data.totalMaxScore) * 100 
                : 0;

              if (studentAverage > topPerformerGrade) {
                topPerformerGrade = studentAverage;
                const student = studentsWithData.find((s: any) => s.id === studentId);
                if (student) {
                  topPerformerName = student.name;
                }
              }

              // Students with average below 70% need attention
              if (studentAverage < 70 && data.count >= 2) {
                const student = studentsWithData.find((s: any) => s.id === studentId);
                if (student) {
                  needsAttentionNames.push(student.name);
                }
              }
            });

            const studentCountValue = (courseData as any)?.student_count || enrollments.length;
            setAnalytics({
              averageGrade,
              totalAssignments: assignmentsData.length,
              totalSubmissions: (allSubmissions || []).length,
              completionRate: studentCountValue > 0 && assignmentsData.length > 0
                ? Math.round(((allSubmissions || []).length / (studentCountValue * assignmentsData.length)) * 100)
                : 0,
              topPerformer: topPerformerName,
              needsAttention: needsAttentionNames,
            });
          } else {
            // No grades yet
            const studentCountValue = (courseData as any)?.student_count || enrollments.length;
            setAnalytics({
              averageGrade: 0,
              totalAssignments: assignmentsData.length,
              totalSubmissions: 0,
              completionRate: 0,
              topPerformer: "—",
              needsAttention: [],
            });
          }
        } else if (assignmentsData && assignmentsData.length > 0) {
          // No enrollments but has assignments
          setAnalytics({
            averageGrade: 0,
            totalAssignments: assignmentsData.length,
            totalSubmissions: 0,
            completionRate: 0,
            topPerformer: "—",
            needsAttention: [],
          });
        }
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
      toast({
        title: "Error",
        description: "Failed to load course data",
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

  if (!course) {
    return (
      <div className="w-full px-6 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-xl font-semibold mb-2">Course not found</h3>
            <p className="text-muted-foreground text-center text-base">
              The course you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use calculated analytics or provide defaults
  const displayAnalytics = analytics || {
    averageGrade: 0,
    totalAssignments: assignments.length,
    totalSubmissions: assignments.reduce((sum: number, a: any) => sum + (a.submissionsCount || 0), 0),
    completionRate: 0,
    topPerformer: "—",
    needsAttention: [],
  };

  const forumPosts: any[] = [];

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{course.name || "Untitled Course"}</h1>
        <p className="text-muted-foreground text-lg">{course.description || "No description"}</p>
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          {course.section && (
            <>
          <span>{course.section}</span>
          <span>•</span>
            </>
          )}
          {course.room && (
            <>
          <span>{course.room}</span>
          <span>•</span>
            </>
          )}
          <span>{course.student_count || 0} students</span>
        </div>
      </div>

      <Tabs defaultValue="assignments" className="w-full">
        <TabsList>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="forum">Forum</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Assignments</CardTitle>
                  <CardDescription className="text-base">View and manage course assignments</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No assignments yet</p>
                </div>
              ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-base">{assignment.title}</h3>
                        <Badge variant={assignment.status === "graded" ? "default" : "secondary"}>
                          {assignment.aiGradedPercent}% AI Graded
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{assignment.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "No due date"}
                        </span>
                        <span>•</span>
                        <span>{assignment.submissionsCount} submissions</span>
                        <span>•</span>
                        <span>Max: {assignment.maxPoints} pts</span>
                      </div>
                    </div>
                    <Button variant="outline" asChild className="ml-4">
                      <Link href={`/assignments/${assignment.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Students</CardTitle>
              <CardDescription className="text-base">Manage enrolled students ({students.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No students enrolled yet</p>
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Badge variant="default">{student.grade}</Badge>
                      </TableCell>
                      <TableCell>{student.submissions}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">View Profile</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{displayAnalytics.averageGrade.toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground mt-1">Class average</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{displayAnalytics.totalAssignments}</div>
                <p className="text-sm text-muted-foreground mt-1">Active assignments</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Submissions</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{displayAnalytics.totalSubmissions}</div>
                <p className="text-sm text-muted-foreground mt-1">Total graded</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{displayAnalytics.completionRate}%</div>
                <p className="text-sm text-muted-foreground mt-1">Assignment completion</p>
              </CardContent>
            </Card>
          </div>
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Performance Insights</CardTitle>
              <CardDescription className="text-base">Key metrics and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <p className="font-semibold mb-1">Top Performer</p>
                  <p className="text-sm text-muted-foreground">
                    {displayAnalytics.topPerformer !== "—" 
                      ? `${displayAnalytics.topPerformer} has the highest average grade in the class.`
                      : "No grades recorded yet."}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="font-semibold mb-1">Needs Attention</p>
                  <p className="text-sm text-muted-foreground">
                    {displayAnalytics.needsAttention.length > 0
                      ? `${displayAnalytics.needsAttention.join(", ")} may benefit from additional support.`
                      : "All students are performing well."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forum" className="mt-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Forum</CardTitle>
                  <CardDescription className="text-base">Course discussion forum</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {forumPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No forum posts yet</p>
                </div>
              ) : (
              <div className="space-y-3">
                {forumPosts.map((post) => (
                  <div key={post.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {post.pinned && <Pin className="h-4 w-4 text-primary" />}
                        <h3 className="font-semibold text-base">{post.title}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>By {post.author}</span>
                        <span>•</span>
                        <span>{post.replies} replies</span>
                        <span>•</span>
                        <span>{post.views} views</span>
                        <span>•</span>
                        <span>Last activity: {new Date(post.lastActivity).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="ml-4">
                      View Thread
                    </Button>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

