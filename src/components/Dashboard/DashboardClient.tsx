"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Inbox,
  RefreshCw,
  CheckCircle2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

export type DashboardClientProps = {
  initialUser?: User | null;
  initialSubscription?: any;
  initialFullName?: string | null;
};

export function DashboardClient({
  initialUser = null,
  initialSubscription = null,
  initialFullName = null,
}: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(initialUser);
  const [userFullName, setUserFullName] = useState<string | null>(initialFullName);
  const [loading, setLoading] = useState(!initialUser);
  const [activeCourses, setActiveCourses] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!initialUser) {
          setLoading(true);
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.push("/auth");
          return;
        }

        setUser(session.user);

        // Fetch user profile
        if (!initialFullName) {
          try {
            const { data: profileData } = await (supabase as any)
              .from("profiles")
              .select("full_name")
              .eq("id", session.user.id)
              .maybeSingle();

            if (profileData?.full_name) {
              setUserFullName(profileData.full_name.trim());
            }
          } catch (error) {
            console.error("Failed to load user profile", error);
          }
        }

        // Fetch active courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, name, description, student_count, section, subject")
          .eq("teacher_id", session.user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(5);

        if (coursesError) {
          console.error("Error fetching courses:", coursesError);
        } else {
          setActiveCourses((coursesData || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            studentsCount: c.student_count || 0,
            section: c.section,
            subject: c.subject,
          })));
        }

        // Fetch recent submissions from user's courses
        const courseIds = (coursesData || []).map((c: any) => c.id);
        
        if (courseIds.length > 0) {
          // Get assignments from these courses
          const { data: assignmentsData } = await supabase
            .from("assignments")
            .select("id, course_id")
            .in("course_id", courseIds);

          const assignmentIds = assignmentsData?.map((a: any) => a.id) || [];

          if (assignmentIds.length > 0) {
            // Get recent submissions
            const { data: submissionsData, error: submissionsError } = await supabase
              .from("submissions")
              .select(`
                id,
                submitted_at,
                assignment_id,
                student_id,
                assignments:assignment_id (
                  id,
                  title,
                  course_id,
                  courses:course_id (
                    id,
                    name
                  )
                ),
                students:student_id (
                  id,
                  full_name,
                  email
                )
              `)
              .in("assignment_id", assignmentIds)
              .order("submitted_at", { ascending: false })
              .limit(5);

            if (!submissionsError && submissionsData) {
              const transformedSubmissions = submissionsData.map((sub: any) => {
                const assignment = sub.assignments || {};
                const course = assignment.courses || {};
                const student = sub.students || {};

                return {
                  id: sub.id,
                  studentName: student.full_name || student.email || "Unknown Student",
                  assignmentName: assignment.title || "Unknown Assignment",
                  courseName: course.name || "Unknown Course",
                  submittedAt: sub.submitted_at,
                };
              });

              setRecentSubmissions(transformedSubmissions);
            }
          }
        }

        // Check Google Classroom connection
        const { data: integration } = await supabase
          .from("google_classroom_integrations")
          .select("sync_status")
          .eq("user_id", session.user.id)
          .maybeSingle();

        setGoogleConnected(!!integration);

        // Fetch real courses if connected
        if (integration) {
          const { data: courses } = await supabase
            .from("courses")
            .select("*")
            .eq("teacher_id", session.user.id)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(5);

          if (courses && courses.length > 0) {
            setActiveCourses(courses.map((c: any) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              studentsCount: c.student_count,
              section: c.section,
              subject: c.subject,
            })));
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Check for OAuth callback messages in URL
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get("success");
      const error = urlParams.get("error");
      const message = urlParams.get("message");

      if (success === "google_connected") {
        toast({
          title: "Success!",
          description: message ? decodeURIComponent(message) : "Google Classroom connected successfully!",
        });
        // Clean URL and refresh
        window.history.replaceState({}, "", window.location.pathname);
        router.refresh();
      } else if (error) {
        toast({
          title: "Error",
          description: message ? decodeURIComponent(message) : "Failed to connect Google Classroom",
          variant: "destructive",
        });
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [initialUser, initialFullName, router, toast]);

  const handleConnectGoogle = () => {
    window.location.href = "/api/google-classroom/authorize";
  };

  const handleSyncCourses = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/google-classroom/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync courses");
      }

      toast({
        title: "Sync Complete",
        description: `Synced ${data.synced} course${data.synced !== 1 ? "s" : ""} from Google Classroom`,
      });

      // Refresh courses
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync courses from Google Classroom",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Are you sure you want to disconnect Google Classroom? You'll need to reconnect to sync courses again.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/google-classroom/disconnect", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect Google Classroom");
      }

      toast({
        title: "Disconnected",
        description: "Google Classroom has been disconnected successfully",
      });

      setGoogleConnected(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect Google Classroom",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              {userFullName ? `Welcome, ${userFullName.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className="text-muted-foreground text-lg">Overview of your courses and assignments</p>
          </div>
          {googleConnected ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Google Classroom Connected</span>
              </div>
              <Button
                onClick={handleSyncCourses}
                disabled={syncing || disconnecting}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Courses"}
              </Button>
              <Button
                onClick={handleDisconnectGoogle}
                disabled={syncing || disconnecting}
                variant="outline"
                size="sm"
              >
                <X className={`h-4 w-4 mr-2 ${disconnecting ? "animate-spin" : ""}`} />
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnectGoogle} size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Connect Google Classroom
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Active Courses */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Active Courses</CardTitle>
            <CardDescription className="text-base">Your current courses</CardDescription>
          </CardHeader>
          <CardContent>
            {activeCourses.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground mb-6 text-base">
                  {googleConnected ? "No courses found. Sync to import from Google Classroom." : "Connect Google Classroom to get started"}
                </p>
                <Button
                  onClick={googleConnected ? handleSyncCourses : handleConnectGoogle}
                  disabled={syncing}
                  size="lg"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : googleConnected ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Courses
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Connect Google Classroom
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCourses.map((course: any) => (
                  <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-base">{course.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{course.studentsCount} students</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/courses/${course.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Recent Submissions</CardTitle>
            <CardDescription className="text-base">Latest student submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Inbox className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground mb-6 text-base">No submissions yet</p>
                <Button variant="outline" asChild size="lg">
                  <Link href="/submissions">View All Submissions</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((submission: any) => (
                  <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-base">{submission.studentName}</p>
                      <p className="text-sm text-muted-foreground mt-1">{submission.assignmentName}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/submissions/${submission.id}`}>Review</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
