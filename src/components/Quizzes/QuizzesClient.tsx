"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileQuestion, Plus, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function QuizzesClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    course: "",
    topic: "",
    difficulty: "",
    questionCount: "",
    timeLimit: "",
    instructions: "",
    useAI: false,
  });

  useEffect(() => {
    fetchQuizzes();
    fetchCourses();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/quizzes");
      const data = await response.json();
      
      if (response.ok) {
        setQuizzes(data.quizzes || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load quizzes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast({
        title: "Error",
        description: "Failed to load quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: coursesData, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("teacher_id", session.user.id)
        .order("name");

      if (error) throw error;
      setCourses(coursesData || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.course) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          course_id: formData.course,
          description: formData.instructions,
          topic: formData.topic,
          difficulty: formData.difficulty,
          questionCount: formData.questionCount,
          timeLimit: formData.timeLimit,
          instructions: formData.instructions,
          useAI: formData.useAI,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message || "Quiz created successfully",
        });
        setIsDialogOpen(false);
        setFormData({
          title: "",
          course: "",
          topic: "",
          difficulty: "",
          questionCount: "",
          timeLimit: "",
          instructions: "",
          useAI: false,
        });
        fetchQuizzes();
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
    <div className="w-full px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Quizzes</h1>
          <p className="text-muted-foreground text-lg">AI-powered quiz creation and management</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate AI Quiz</DialogTitle>
              <DialogDescription>
                Fill in the details below to generate an AI-powered quiz for your course
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Java Fundamentals Quiz"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select value={formData.course} onValueChange={(value) => setFormData({ ...formData, course: value })} required>
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                      {courses.length === 0 && (
                        <SelectItem value="no-courses" disabled>
                          No courses available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="topic">Topic/Subject *</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Java OOP, HTML Basics, Binary Trees"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="difficulty">Difficulty Level *</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                      required
                    >
                      <SelectTrigger id="difficulty">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="questionCount">Number of Questions *</Label>
                    <Input
                      id="questionCount"
                      type="number"
                      min="5"
                      max="50"
                      placeholder="e.g., 15"
                      value={formData.questionCount}
                      onChange={(e) => setFormData({ ...formData, questionCount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="5"
                    placeholder="e.g., 30 (optional)"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="instructions">Additional Instructions / Context</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Provide any specific topics to focus on, question types preferred, or additional context for the AI..."
                    rows={4}
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                  <Checkbox
                    id="useAI"
                    checked={formData.useAI}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useAI: checked === true })
                    }
                  />
                  <Label
                    htmlFor="useAI"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Use AI to generate quiz questions</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-normal">
                      AI generation will be available soon. For now, this creates a placeholder quiz.
                    </p>
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : formData.useAI ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create Quiz {formData.useAI && "with AI"}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Quiz
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="w-full px-6 py-8 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="shadow-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <FileQuestion className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground text-center mb-6 text-base">
              Create AI-powered quizzes from your course materials
            </p>
            <Button size="lg" onClick={() => setIsDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Quiz with AI
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz: any) => (
            <Card key={quiz.id} className="cursor-pointer hover:shadow-md transition-all border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{quiz.title}</CardTitle>
                <CardDescription className="text-base">{quiz.courseName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base text-muted-foreground">{quiz.questionsCount} questions</span>
                  <Badge variant={quiz.published ? "default" : "secondary"}>
                    {quiz.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <Button variant="outline" className="w-full">
                  View Quiz
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

