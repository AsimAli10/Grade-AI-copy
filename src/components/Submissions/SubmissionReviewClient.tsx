"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Edit, MessageSquare, Flag, History } from "lucide-react";

type SubmissionReviewClientProps = {
  submissionId: string;
};

export default function SubmissionReviewClient({ submissionId }: SubmissionReviewClientProps) {
  // TODO: Fetch submission data from API

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Submission Review</h1>
        <p className="text-muted-foreground mt-1">Student: Student Name | Assignment: Assignment Name</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Submission Viewer */}
        <Card>
          <CardHeader>
            <CardTitle>Submission</CardTitle>
            <CardDescription>Student&apos;s submitted work</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text" className="w-full">
              <TabsList>
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="file">File</TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-4">
                <div className="border rounded-lg p-4 min-h-[400px] bg-muted/30">
                  <p className="text-muted-foreground">Submission text content will appear here</p>
                </div>
              </TabsContent>
              <TabsContent value="code" className="mt-4">
                <div className="border rounded-lg p-4 min-h-[400px] bg-muted/30">
                  <p className="text-muted-foreground">Code viewer with syntax highlighting will appear here</p>
                </div>
              </TabsContent>
              <TabsContent value="file" className="mt-4">
                <div className="border rounded-lg p-4 min-h-[400px] bg-muted/30">
                  <p className="text-muted-foreground">Image/PDF viewer will appear here</p>
                </div>
              </TabsContent>
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
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Overall Grade</span>
                <Badge variant="default">85/100</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <Badge variant="secondary">92%</Badge>
              </div>
            </div>

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


