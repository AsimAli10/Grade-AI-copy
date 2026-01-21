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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type QuizCreatorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
  onSuccess?: () => void;
};

export function QuizCreator({
  open,
  onOpenChange,
  courseId,
  onSuccess,
}: QuizCreatorProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [canPostToGCR, setCanPostToGCR] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course_id: courseId || "",
    question_type: "multiple_choice",
    question: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    points: "1",
    time_limit_minutes: "",
    use_ai: false,
    post_to_google_classroom: false,
  });

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setFormData({
        title: "",
        description: "",
        course_id: courseId || "",
        question_type: "multiple_choice",
        question: "",
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        points: "1",
        time_limit_minutes: "",
        use_ai: false,
        post_to_google_classroom: false,
      });
      
      // Fetch courses if no courseId provided
      if (!courseId) {
        fetchCourses();
      }
      
      // Check if course is linked to Google Classroom
      if (courseId) {
        checkGoogleClassroomLink();
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
      
      // Check Google Classroom link for selected course
      if (formData.course_id) {
        const selectedCourse = (coursesData as any)?.find((c: any) => c.id === formData.course_id);
        setCanPostToGCR(!!selectedCourse?.google_classroom_course_id);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const checkGoogleClassroomLink = async () => {
    if (!courseId) {
      setCanPostToGCR(false);
      return;
    }
    
    try {
      const { data: course } = await supabase
        .from("courses")
        .select("google_classroom_course_id")
        .eq("id", courseId)
        .maybeSingle();
      
      setCanPostToGCR(!!(course as any)?.google_classroom_course_id);
    } catch (error) {
      console.error("Error checking Google Classroom link:", error);
      setCanPostToGCR(false);
    }
  };

  const handleCourseChange = (value: string) => {
    setFormData((prev) => ({ ...prev, course_id: value }));
    const selectedCourse = courses.find(c => c.id === value);
    setCanPostToGCR(!!selectedCourse?.google_classroom_course_id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      toast({
        title: "Error",
        description: "Please provide a quiz title",
        variant: "destructive",
      });
      return;
    }

    if (!formData.course_id) {
      toast({
        title: "Error",
        description: "Please select a course",
        variant: "destructive",
      });
      return;
    }

    // Validate question based on type
    if (!formData.use_ai) {
      if (!formData.question.trim()) {
        toast({
          title: "Error",
          description: "Please provide a question",
          variant: "destructive",
        });
        return;
      }

      if (formData.question_type === "multiple_choice") {
        if (!formData.option1.trim() || !formData.option2.trim()) {
          toast({
            title: "Error",
            description: "Please provide at least 2 options for multiple choice",
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      // Build question object
      let question: any = null;
      if (!formData.use_ai) {
        if (formData.question_type === "multiple_choice") {
          const options = [
            formData.option1,
            formData.option2,
            formData.option3,
            formData.option4,
          ].filter(opt => opt.trim());

          question = {
            id: `q-${Date.now()}`,
            type: "multiple_choice",
            question: formData.question,
            options: options,
            points: parseInt(formData.points) || 1,
          };
        } else {
          // short_answer
          question = {
            id: `q-${Date.now()}`,
            type: "short_answer",
            question: formData.question,
            points: parseInt(formData.points) || 1,
          };
        }
      }

      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          course_id: formData.course_id,
          description: formData.description || null,
          questions: formData.use_ai ? [] : [question],
          time_limit_minutes: formData.time_limit_minutes
            ? parseInt(formData.time_limit_minutes)
            : null,
          post_to_google_classroom: formData.post_to_google_classroom,
          use_ai: formData.use_ai,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.postedToGoogleClassroom
            ? formData.use_ai
              ? "Quiz placeholder created. AI generation coming soon."
              : "Quiz created and posted to Google Classroom"
            : formData.use_ai
            ? "Quiz placeholder created. AI generation coming soon."
            : "Quiz created successfully",
        });
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create quiz",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast({
        title: "Error",
        description: "Failed to create quiz",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quiz</DialogTitle>
          <DialogDescription>
            Create a quiz with a single question. You can use AI generation (coming soon) or create manually.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Quiz title"
                required
              />
            </div>

            {!courseId && (
              <div className="space-y-2">
                <Label htmlFor="course_id">Course *</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={handleCourseChange}
                  required
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
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Quiz description (optional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
              <Input
                id="time_limit_minutes"
                type="number"
                min="1"
                value={formData.time_limit_minutes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    time_limit_minutes: e.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
              <Checkbox
                id="use_ai"
                checked={formData.use_ai}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    use_ai: checked === true,
                  }))
                }
              />
              <Label
                htmlFor="use_ai"
                className="text-sm font-medium leading-none cursor-pointer flex-1"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Use AI to generate question (Coming Soon)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-normal">
                  AI generation will create a question based on your course content. For now, this creates a placeholder quiz.
                </p>
              </Label>
            </div>

            {!formData.use_ai && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="question_type">Question Type *</Label>
                  <Select
                    value={formData.question_type}
                    onValueChange={(value: "multiple_choice" | "short_answer") =>
                      setFormData((prev) => ({
                        ...prev,
                        question_type: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question">Question *</Label>
                  <Textarea
                    id="question"
                    value={formData.question}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        question: e.target.value,
                      }))
                    }
                    placeholder="Enter your question"
                    rows={3}
                    required
                  />
                </div>

                {formData.question_type === "multiple_choice" && (
                  <div className="space-y-3">
                    <Label>Options *</Label>
                    {[1, 2, 3, 4].map((num) => {
                      const optionKey = `option${num}` as keyof typeof formData;
                      return (
                        <div key={num}>
                          <Input
                            placeholder={`Option ${num}${num <= 2 ? " *" : ""}`}
                            value={(formData[optionKey] as string) || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                [optionKey]: e.target.value,
                              }))
                            }
                            required={num <= 2}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="points">Points *</Label>
                  <Input
                    id="points"
                    type="number"
                    min="1"
                    value={formData.points}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        points: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </>
            )}

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
              {submitting
                ? "Creating..."
                : formData.use_ai
                ? "Create Quiz (AI Coming Soon)"
                : "Create Quiz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
