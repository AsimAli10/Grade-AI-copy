"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Edit, MessageSquare, Flag, History, ExternalLink, FileText } from "lucide-react";
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

  const fetchSubmissionData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Fetch submission with all related data
      const { data: submissionData, error: submissionError } = await supabase
        .from("submissions")
        .select(`
          *,
          assignments:assignment_id (
            id,
            title,
            description,
            max_points,
            courses:course_id (
              id,
              name
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
      setAssignment((submissionData as any).assignments);

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
            {grade ? (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Overall Grade</span>
                  <Badge variant="default">
                    {grade.overall_score}/{grade.max_score || assignment?.max_points || 100}
                  </Badge>
                </div>
                {grade.ai_confidence && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <Badge variant={grade.ai_confidence === "high" ? "default" : grade.ai_confidence === "medium" ? "secondary" : "outline"}>
                      {grade.ai_confidence === "high" ? "High" : grade.ai_confidence === "medium" ? "Medium" : "Low"}
                    </Badge>
                  </div>
                )}
                {grade.feedback && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Feedback:</p>
                    <p className="text-sm">{grade.feedback}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <p className="text-muted-foreground text-sm">No grade assigned yet</p>
              </div>
            )}

            {/* Criteria Cards */}
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Criterion 1</span>
                  <Badge>20/25</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Explanation of the score and feedback...
                </p>
                <p className="text-xs text-primary">Evidence highlighted in submission</p>
              </div>
              {/* More criteria cards... */}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Accept AI Grade
              </Button>
              <Button variant="outline" className="w-full">
                <Edit className="h-4 w-4 mr-2" />
                Edit Scores
              </Button>
              <Button variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Comment to Student
              </Button>
              <Button variant="outline" className="w-full">
                <Flag className="h-4 w-4 mr-2" />
                Flag for Regrade
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Timeline */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Grading History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">History timeline will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
}


