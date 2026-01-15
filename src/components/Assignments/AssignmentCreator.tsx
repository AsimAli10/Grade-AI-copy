"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type AssignmentCreatorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
  onSuccess?: () => void;
};

export function AssignmentCreator({
  open,
  onOpenChange,
  courseId,
  onSuccess,
}: AssignmentCreatorProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    course_id: courseId || "",
    title: "",
    description: "",
    assignment_type: "essay",
    max_points: "100",
    due_date: "",
    due_time: "",
    rubric_id: "",
    post_to_google_classroom: false,
  });

  useEffect(() => {
    if (open) {
      fetchCourses();
      if (courseId) {
        setFormData((prev) => ({ ...prev, course_id: courseId }));
      }
    }
  }, [open, courseId]);

  const fetchCourses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: coursesData, error } = await supabase
        .from("courses")
        .select("id, name, google_classroom_course_id")
        .eq("teacher_id", session.user.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCourses(coursesData || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.course_id || !formData.title) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Combine due_date and due_time if both are provided
      let due_date: string | null = null;
      if (formData.due_date) {
        if (formData.due_time) {
          due_date = new Date(`${formData.due_date}T${formData.due_time}`).toISOString();
        } else {
          due_date = new Date(`${formData.due_date}T23:59:59`).toISOString();
        }
      }

      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_id: formData.course_id,
          title: formData.title,
          description: formData.description,
          assignment_type: formData.assignment_type,
          max_points: parseFloat(formData.max_points) || 100,
          due_date: due_date,
          rubric_id: formData.rubric_id || null,
          post_to_google_classroom: formData.post_to_google_classroom,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.postedToGoogleClassroom
            ? "Assignment created and posted to Google Classroom"
            : "Assignment created successfully",
        });
        onOpenChange(false);
        setFormData({
          course_id: courseId || "",
          title: "",
          description: "",
          assignment_type: "essay",
          max_points: "100",
          due_date: "",
          due_time: "",
          rubric_id: "",
          post_to_google_classroom: false,
        });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create assignment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === formData.course_id);
  const canPostToGCR = selectedCourse?.google_classroom_course_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
          <DialogDescription>
            Create a new assignment for your course. You can optionally post it to Google Classroom if the course is linked.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="course_id">Course *</Label>
              <Select
                value={formData.course_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, course_id: value }))
                }
                disabled={!!courseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Assignment title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Assignment description and instructions"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignment_type">Assignment Type</Label>
                <Select
                  value={formData.assignment_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, assignment_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="math">Math</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="file_upload">File Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_points">Max Points</Label>
                <Input
                  id="max_points"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.max_points}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, max_points: e.target.value }))
                  }
                  placeholder="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, due_date: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_time">Due Time</Label>
                <Input
                  id="due_time"
                  type="time"
                  value={formData.due_time}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, due_time: e.target.value }))
                  }
                />
              </div>
            </div>

            {canPostToGCR && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="post_to_gcr"
                  checked={formData.post_to_google_classroom}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      post_to_google_classroom: checked === true,
                    }))
                  }
                />
                <Label
                  htmlFor="post_to_gcr"
                  className="text-sm font-normal cursor-pointer"
                >
                  Post to Google Classroom
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

