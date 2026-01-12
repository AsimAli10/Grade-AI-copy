"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch the count of submissions that need review
 * Returns submissions with status "submitted" or "needs_review" that don't have a grade yet
 */
export function usePendingSubmissionsCount() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchPendingCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setCount(0);
        setLoading(false);
        return;
      }

      // Get the user's courses to filter submissions they can see
      const { data: userCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", session.user.id);

      const courseIds = userCourses?.map((c: any) => c.id) || [];

      if (courseIds.length === 0) {
        setCount(0);
        setLoading(false);
        return;
      }

      // Fetch assignments from user's courses
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id")
        .in("course_id", courseIds);

      const assignmentIds = assignments?.map((a: any) => a.id) || [];

      if (assignmentIds.length === 0) {
        setCount(0);
        setLoading(false);
        return;
      }

      // Fetch submissions that need review (submitted or needs_review status)
      const { data: pendingSubmissions } = await supabase
        .from("submissions")
        .select("id")
        .in("assignment_id", assignmentIds)
        .in("status", ["submitted", "needs_review"]);

      if (!pendingSubmissions) {
        setCount(0);
        setLoading(false);
        return;
      }

      // Get submission IDs
      const submissionIds = pendingSubmissions.map((s: any) => s.id);

      if (submissionIds.length === 0) {
        setCount(0);
        setLoading(false);
        return;
      }

      // Check which submissions don't have grades yet
      const { data: gradedSubmissions } = await supabase
        .from("grades")
        .select("submission_id")
        .in("submission_id", submissionIds);

      const gradedSubmissionIds = new Set(
        gradedSubmissions?.map((g: any) => g.submission_id) || []
      );

      // Count submissions that need review (pending and not graded)
      const pendingCount = submissionIds.filter(
        (id) => !gradedSubmissionIds.has(id)
      ).length;

      setCount(pendingCount);
    } catch (error) {
      console.error("Error fetching pending submissions count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { count, loading };
}

