"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, RefreshCw, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function CoursesClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Check Google Classroom connection
      const { data: integration } = await supabase
        .from("google_classroom_integrations")
        .select("sync_status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setGoogleConnected(!!integration);

      // Fetch courses
      const { data: coursesData, error } = await supabase
        .from("courses")
        .select("*")
        .eq("teacher_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching courses:", error);
        toast({
          title: "Error",
          description: "Failed to load courses",
          variant: "destructive",
        });
      } else {
        setCourses(coursesData || []);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

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
      await fetchCourses();
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
      await fetchCourses();
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
      <div className="w-full px-6 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Courses</h1>
          <p className="text-muted-foreground text-lg">Manage your Google Classroom courses</p>
        </div>
        <div className="flex items-center gap-3">
          {googleConnected && (
            <>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Connected</span>
              </div>
              <Button
                onClick={handleSyncCourses}
                disabled={syncing || disconnecting}
                variant="outline"
                size="lg"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Courses"}
              </Button>
              <Button
                onClick={handleDisconnectGoogle}
                disabled={syncing || disconnecting}
                variant="outline"
                size="lg"
              >
                <X className={`h-4 w-4 mr-2 ${disconnecting ? "animate-spin" : ""}`} />
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </>
          )}
          {!googleConnected && (
            <Button onClick={handleConnectGoogle} size="lg">
              <BookOpen className="h-4 w-4 mr-2" />
              Connect Google Classroom
            </Button>
          )}
        </div>
      </div>

      {courses.length === 0 ? (
        <Card className="shadow-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
            <p className="text-muted-foreground text-center mb-6 text-base">
              {googleConnected ? "No courses found. Sync to import from Google Classroom." : "Connect your Google Classroom to sync courses"}
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
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: any) => (
            <Card key={course.id} className="cursor-pointer hover:shadow-md transition-all border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{course.name}</CardTitle>
                <CardDescription className="text-base">{course.description}</CardDescription>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {course.section && <span>{course.section}</span>}
                  {course.section && <span>•</span>}
                  <span>{course.student_count || 0} students</span>
                  {course.room && (
                    <>
                      <span>•</span>
                      <span>{course.room}</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/courses/${course.id}`}>View Course</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

