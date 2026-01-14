"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Edit, MessageSquare, Flag, History, ExternalLink, FileText, Save, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type SubmissionReviewClientProps = {
  submissionId: string;
};

export default function SubmissionReviewClient({ submissionId }: SubmissionReviewClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [grade, setGrade] = useState<any>(null);
  const [rubric, setRubric] = useState<any>(null);
  const [gradeHistory, setGradeHistory] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchSubmissionData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Fetch user profile to get role
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profileError && profileData) {
        const profileTyped = profileData as any;
        setUserRole(profileTyped.role);
        console.log("User role:", profileTyped.role);
      } else {
        console.error("Error fetching user role:", profileError);
        // Default to teacher if profile fetch fails (for backwards compatibility)
        setUserRole("teacher");
      }

      // Fetch submission with all related data including rubric
      const { data: submissionData, error: submissionError } = await supabase
        .from("submissions")
        .select(`
          *,
          assignments:assignment_id (
            id,
            title,
            description,
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
          )
        `)
        .eq("id", submissionId)
        .single();

      if (submissionError || !submissionData) {
        console.error("Error fetching submission:", submissionError);
        toast({
          title: "Error",
          description: "Failed to load submission",
          variant: "destructive",
        });
        return;
      }

      setSubmission(submissionData);
      const assignmentData = (submissionData as any).assignments;
      setAssignment(assignmentData);
      
      // Set rubric if assignment has one
      if (assignmentData?.rubrics) {
        setRubric(assignmentData.rubrics);
      }

      // Fetch student profile
      const { data: studentData, error: studentError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", (submissionData as any).student_id)
        .single();

      if (!studentError && studentData) {
        setStudent(studentData);
      }

      // Fetch grade if exists
      const { data: gradeData, error: gradeError } = await supabase
        .from("grades")
        .select("*")
        .eq("submission_id", submissionId)
        .maybeSingle();

      if (!gradeError && gradeData) {
        setGrade(gradeData);
        const gradeDataTyped = gradeData as any;
        setEditingGrade({
          overall_score: gradeDataTyped.overall_score,
          max_score: gradeDataTyped.max_score,
          criterion_scores: { ...gradeDataTyped.criterion_scores },
        });
        setTeacherNotes(gradeDataTyped.teacher_notes || "");
        
        // Fetch grade history
        const { data: historyData, error: historyError } = await supabase
          .from("grade_history")
          .select(`
            *,
            changed_by_profile:changed_by (
              id,
              full_name,
              email
            )
          `)
          .eq("grade_id", gradeDataTyped.id)
          .order("created_at", { ascending: false });
        
        if (!historyError && historyData) {
          setGradeHistory(historyData);
        }
      }
    } catch (error) {
      console.error("Error fetching submission data:", error);
      toast({
        title: "Error",
        description: "Failed to load submission data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [submissionId, router, toast]);

  useEffect(() => {
    fetchSubmissionData();
  }, [fetchSubmissionData]);

  const handleSaveGrade = async () => {
    if (!editingGrade) return;

    setSaving(true);
    try {
      // Calculate overall score from criterion scores if not manually set
      let overallScore = editingGrade.overall_score;
      
      // If overall score is 0 or not set, calculate from criterion scores
      if (overallScore === 0 || !overallScore) {
        const criterionScores = editingGrade.criterion_scores || {};
        overallScore = Object.values(criterionScores).reduce((sum: number, score: any) => {
          return sum + (parseFloat(score) || 0);
        }, 0);
      }

      // If grade doesn't exist, create it first
      if (!grade) {
        const response = await fetch("/api/grades", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submission_id: submissionId,
            overall_score: overallScore,
            max_score: editingGrade.max_score,
            criterion_scores: editingGrade.criterion_scores,
            teacher_notes: teacherNotes,
            grade_status: "teacher_reviewed",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create grade");
        }

        toast({
          title: "Success",
          description: "Grade created successfully",
        });

        setIsEditing(false);
        // Refresh grade data
        await fetchSubmissionData();
      } else {
        // Update existing grade
        const response = await fetch(`/api/grades/${grade.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            overall_score: overallScore,
            max_score: editingGrade.max_score,
            criterion_scores: editingGrade.criterion_scores,
            teacher_notes: teacherNotes,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update grade");
        }

        toast({
          title: "Success",
          description: "Grade updated successfully",
        });

        setIsEditing(false);
        // Refresh grade data
        await fetchSubmissionData();
      }
    } catch (error: any) {
      console.error("Error saving grade:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save grade",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptGrade = async () => {
    if (!grade) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/grades/${grade.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grade_status: "accepted",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept grade");
      }

      toast({
        title: "Success",
        description: "Grade accepted",
      });

      // Refresh grade data
      await fetchSubmissionData();
    } catch (error: any) {
      console.error("Error accepting grade:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept grade",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFlagForReview = async () => {
    if (!grade) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/grades/${grade.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flagged_for_review: !grade.flagged_for_review,
          flag_reason: grade.ai_confidence === "low" ? "Low AI confidence" : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update flag status");
      }

      toast({
        title: "Success",
        description: grade.flagged_for_review ? "Grade unflagged" : "Grade flagged for review",
      });

      // Refresh grade data
      await fetchSubmissionData();
    } catch (error: any) {
      console.error("Error flagging grade:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update flag status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-xl font-semibold mb-2">Submission not found</h3>
            <p className="text-muted-foreground">The submission you&apos;re looking for doesn&apos;t exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fileUrls = (submission.file_urls || []) as string[];
  const hasFiles = fileUrls.length > 0;
  const hasText = submission.content;
  const hasCode = submission.code_content;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Submission Review</h1>
        <p className="text-muted-foreground mt-1">
          Student: {student?.full_name || student?.email || "Unknown"} | 
          Assignment: {assignment?.title || "Unknown Assignment"}
          {assignment?.courses && ` | Course: ${(assignment.courses as any).name}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Submission Viewer */}
        <Card>
          <CardHeader>
            <CardTitle>Submission</CardTitle>
            <CardDescription>Student&apos;s submitted work</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={hasFiles ? "file" : hasText ? "text" : "code"} className="w-full">
              <TabsList>
                {hasText && <TabsTrigger value="text">Text</TabsTrigger>}
                {hasCode && <TabsTrigger value="code">Code</TabsTrigger>}
                {hasFiles && <TabsTrigger value="file">Files ({fileUrls.length})</TabsTrigger>}
              </TabsList>
              {hasText && (
                <TabsContent value="text" className="mt-4">
                  <div className="border rounded-lg p-4 min-h-[400px] bg-muted/30">
                    <pre className="whitespace-pre-wrap text-sm">{submission.content}</pre>
                  </div>
                </TabsContent>
              )}
              {hasCode && (
                <TabsContent value="code" className="mt-4">
                  <div className="border rounded-lg p-4 min-h-[400px] bg-muted/30">
                    <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto">{submission.code_content}</pre>
                  </div>
                </TabsContent>
              )}
              {hasFiles && (
                <TabsContent value="file" className="mt-4">
                  <div className="space-y-4">
                    {fileUrls.map((url, index) => {
                      // Check if it's a Google Drive link
                      const isGoogleDrive = url.includes('drive.google.com');
                      // Extract file name from URL if possible, or use index
                      const fileName = isGoogleDrive 
                        ? url.match(/\/d\/([^\/]+)/)?.[1] 
                          ? `Google Drive File ${index + 1}` 
                          : `File ${index + 1}`
                        : url.split('/').pop() || `File ${index + 1}`;
                      
                      // Determine file type
                      const isPdf = url.toLowerCase().includes('pdf') || 
                                   url.toLowerCase().includes('/preview') ||
                                   fileName.toLowerCase().endsWith('.pdf');
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || 
                                     url.includes('uc?export=view');
                      
                      // For Google Drive preview links, they should work in iframe
                      const viewUrl = isGoogleDrive && isPdf 
                        ? url 
                        : isGoogleDrive && isImage
                        ? url
                        : url;
                      
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {fileName}
                                {isPdf && " (PDF)"}
                                {isImage && " (Image)"}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open
                              </a>
                            </Button>
                          </div>
                          {isPdf ? (
                            <div className="mt-4 border rounded-lg overflow-hidden bg-muted/30">
                              <iframe
                                src={viewUrl}
                                className="w-full h-[600px] border-0"
                                title={`PDF Viewer ${index + 1}`}
                                allow="fullscreen"
                              />
                              <div className="p-2 bg-muted/50 text-center text-xs text-muted-foreground">
                                If the PDF doesn&apos;t load, click &quot;Open&quot; to view in Google Drive
                              </div>
                            </div>
                          ) : isImage ? (
                            <div className="mt-4">
                              <img
                                src={viewUrl}
                                alt={`Submission file ${index + 1}`}
                                className="max-w-full h-auto rounded-lg border"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="p-4 text-center text-muted-foreground border rounded-lg">
                                        <p class="mb-2">Unable to load image preview</p>
                                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline">
                                          Open in new tab →
                                        </a>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground mb-2">
                                Preview not available for this file type
                              </p>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm"
                              >
                                Open in new tab →
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              )}
              {!hasText && !hasCode && !hasFiles && (
                <TabsContent value="text" className="mt-4">
                  <div className="border rounded-lg p-4 min-h-[400px] bg-muted/30 flex items-center justify-center">
                    <p className="text-muted-foreground">No submission content available</p>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Right: AI Grading Panel */}
        <Card>
          <CardHeader>
            <CardTitle>AI Grading</CardTitle>
            <CardDescription>AI-generated scores and feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Grade */}
            {(grade || isEditing) ? (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Overall Grade</span>
                  {(isEditing && (userRole === "teacher" || userRole === "admin")) ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20 h-8"
                        value={editingGrade?.overall_score || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string for clearing, or parse the number
                          const numValue = value === "" ? 0 : parseFloat(value);
                          if (!isNaN(numValue)) {
                            setEditingGrade({
                              ...editingGrade,
                              overall_score: numValue,
                            });
                          }
                        }}
                        onBlur={(e) => {
                          // Calculate from criterion scores if overall is 0 or empty
                          if (!editingGrade?.overall_score || editingGrade.overall_score === 0) {
                            const criterionScores = editingGrade?.criterion_scores || {};
                            const calculated: number = Object.values(criterionScores).reduce((sum: number, score: any) => {
                              return sum + (parseFloat(score) || 0);
                            }, 0) as number;
                            if (calculated > 0) {
                              setEditingGrade({
                                ...editingGrade,
                                overall_score: calculated,
                              });
                            }
                          }
                        }}
                        min="0"
                        step="0.1"
                        placeholder="0"
                      />
                      <span>/</span>
                      <Input
                        type="number"
                        className="w-20 h-8"
                        value={editingGrade?.max_score || assignment?.max_points || 100}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === "" ? 100 : parseFloat(value);
                          if (!isNaN(numValue) && numValue > 0) {
                            setEditingGrade({
                              ...editingGrade,
                              max_score: numValue,
                            });
                          }
                        }}
                        min="1"
                        step="0.1"
                      />
                    </div>
                  ) : (
                    <Badge variant="default">
                      {grade?.overall_score || 0}/{grade?.max_score || assignment?.max_points || 100}
                    </Badge>
                  )}
                </div>
                {grade?.ai_confidence && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">AI Confidence:</span>
                    <Badge variant={grade.ai_confidence === "high" ? "default" : grade.ai_confidence === "medium" ? "secondary" : "outline"}>
                      {grade.ai_confidence === "high" ? "High" : grade.ai_confidence === "medium" ? "Medium" : "Low"}
                    </Badge>
                    {grade.ai_confidence === "low" && (userRole === "teacher" || userRole === "admin") && !isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFlagForReview()}
                        className="ml-2"
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        Flag
                      </Button>
                    )}
                  </div>
                )}
                {grade?.flagged_for_review && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">
                      Flagged for review{grade.flag_reason && `: ${grade.flag_reason}`}
                    </span>
                  </div>
                )}
                {grade?.grade_status && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant="outline">
                      {grade.grade_status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <p className="text-muted-foreground text-sm">No grade assigned yet</p>
              </div>
            )}

            {/* Rubric Display */}
            {rubric ? (
              <div className="space-y-3">
                <div className="border-b pb-2 mb-3">
                  <h4 className="font-semibold text-sm">Grading Rubric</h4>
                  {rubric.description && (
                    <p className="text-xs text-muted-foreground mt-1">{rubric.description}</p>
                  )}
                </div>
                {Array.isArray(rubric.criteria) && rubric.criteria.length > 0 ? (
                  rubric.criteria.map((criterion: any, idx: number) => {
                    // Check if grade has scores for this criterion
                    const criterionScore = grade?.criterion_scores?.[criterion.name] || 
                                          grade?.criterion_scores?.[idx] || 
                                          null;
                    const maxPoints = criterion.max_points || 0;
                    
                    return (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <span className="font-medium text-sm">{criterion.name || `Criterion ${idx + 1}`}</span>
                            {criterion.description && (
                              <p className="text-xs text-muted-foreground mt-1">{criterion.description}</p>
                            )}
                          </div>
                          {(isEditing && (userRole === "teacher" || userRole === "admin")) ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="w-20 h-8"
                                value={editingGrade?.criterion_scores?.[criterion.name] || editingGrade?.criterion_scores?.[idx] || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const numValue = value === "" ? 0 : parseFloat(value);
                                  if (!isNaN(numValue)) {
                                    const newScores = { ...(editingGrade?.criterion_scores || {}) };
                                    newScores[criterion.name] = numValue;
                                    setEditingGrade({
                                      ...editingGrade,
                                      criterion_scores: newScores,
                                    });
                                    
                                    // Auto-calculate overall score
                                    const calculated = Object.values(newScores).reduce((sum: number, score: any) => {
                                      return sum + (parseFloat(score) || 0);
                                    }, 0);
                                    setEditingGrade((prev: any) => ({
                                      ...prev,
                                      overall_score: calculated,
                                    }));
                                  }
                                }}
                                min="0"
                                max={maxPoints}
                                step="0.1"
                                placeholder="0"
                              />
                              <span className="text-sm">/{maxPoints}</span>
                            </div>
                          ) : (
                            <Badge variant={criterionScore !== null ? "default" : "outline"}>
                              {criterionScore !== null ? `${criterionScore}/${maxPoints}` : `—/${maxPoints}`}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Show levels if available */}
                        {criterion.levels && Array.isArray(criterion.levels) && criterion.levels.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Grading Levels:</p>
                            <div className="space-y-1">
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
                          </div>
                        )}
                        
                        {/* Show AI explanation if available */}
                        {grade?.ai_explanations?.[criterion.name] && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1">AI Feedback:</p>
                            <p className="text-xs">{grade.ai_explanations[criterion.name]}</p>
                          </div>
                        )}
                        
                        {/* Show evidence highlights if available */}
                        {grade?.evidence_highlights?.[criterion.name] && 
                         Array.isArray(grade.evidence_highlights[criterion.name]) && 
                         grade.evidence_highlights[criterion.name].length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-primary mb-1">Evidence Highlighted:</p>
                            <ul className="text-xs text-muted-foreground list-disc list-inside">
                              {grade.evidence_highlights[criterion.name].map((highlight: string, hIdx: number) => (
                                <li key={hIdx}>{highlight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No criteria defined in rubric</p>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  No rubric assigned to this assignment. 
                  {assignment?.rubric_id ? " Rubric may not be synced yet." : " Add a rubric in Google Classroom and re-sync."}
                </p>
              </div>
            )}

            {/* Teacher Notes - Show when editing or when grade exists */}
            {(isEditing || grade) && (userRole === "teacher" || userRole === "admin") && (
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="teacher-notes">Teacher Notes / Feedback</Label>
                <Textarea
                  id="teacher-notes"
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Add your feedback or notes for this submission..."
                  rows={3}
                  disabled={!isEditing}
                />
              </div>
            )}
            
            {/* Student View - Show teacher notes if available */}
            {grade && userRole === "student" && grade.teacher_notes && (
              <div className="space-y-2 pt-4 border-t">
                <Label>Teacher Feedback</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{grade.teacher_notes}</p>
                </div>
              </div>
            )}

            {/* Action Buttons - Only show to teachers/admins */}
            {(userRole === "teacher" || userRole === "admin") && (
              <div className="flex flex-col gap-2 pt-4 border-t">
                {isEditing ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={handleSaveGrade}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : grade ? "Save Changes" : "Save Grade"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setIsEditing(false);
                        if (grade) {
                          setEditingGrade({
                            overall_score: grade.overall_score,
                            max_score: grade.max_score,
                            criterion_scores: { ...grade.criterion_scores },
                          });
                          setTeacherNotes(grade.teacher_notes || "");
                        } else {
                          setEditingGrade(null);
                          setTeacherNotes("");
                        }
                      }}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : grade ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Scores
                    </Button>
                    {/* Accept AI Grade button - disabled until AI grading is implemented */}
                    {grade.grade_status === "ai_graded" && (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                        title="AI grading coming soon"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Accept AI Grade (Coming Soon)
                      </Button>
                    )}
                    {grade.ai_confidence === "low" && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleFlagForReview()}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        {grade.flagged_for_review ? "Unflag" : "Flag for Review"}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <Button 
                      className="w-full"
                      onClick={() => {
                        // Initialize a new grade for manual grading
                        const maxPoints = assignment?.max_points || 100;
                        const initialCriterionScores: Record<string, number> = {};
                        if (rubric?.criteria) {
                          rubric.criteria.forEach((criterion: any, idx: number) => {
                            initialCriterionScores[criterion.name || idx] = 0;
                          });
                        }
                        setEditingGrade({
                          overall_score: 0,
                          max_score: maxPoints,
                          criterion_scores: initialCriterionScores,
                        });
                        setIsEditing(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Grade Manually
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                      title="AI grading coming soon"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Grade with AI (Coming Soon)
                    </Button>
                  </div>
                )}
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>

      {/* History Timeline */}
      {grade && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Grading History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gradeHistory.length > 0 ? (
              <div className="space-y-4">
                {gradeHistory.map((entry: any, idx: number) => {
                  const changedBy = entry.changed_by_profile;
                  const changedByName = changedBy?.full_name || changedBy?.email || "Unknown";
                  
                  return (
                    <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{entry.action.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        {entry.previous_score !== null && entry.new_score !== null && (
                          <div className="text-sm text-muted-foreground">
                            Score: {entry.previous_score} → {entry.new_score}
                          </div>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Changed by: {changedByName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No history available yet</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


