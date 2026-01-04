"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, FileText } from "lucide-react";

export function AnalyticsClient() {
  // TODO: Implement GradeAI analytics
  // For now, using dummy data
  const analytics = {
    totalAssignments: 12,
    totalStudents: 64,
    averageGrade: 85.3,
    totalSubmissions: 156,
    completionRate: 78.5,
  };

  const topStudents = [
    { name: "Sarah Johnson", course: "AP Computer Science A", grade: 94.5, trend: "+2.3%" },
    { name: "Michael Chen", course: "Introduction to Web Development", grade: 92.1, trend: "+1.8%" },
    { name: "David Kim", course: "Data Structures and Algorithms", grade: 91.8, trend: "+0.5%" },
  ];

  const coursePerformance = [
    { course: "AP Computer Science A", avgGrade: 87.5, students: 24, assignments: 4 },
    { course: "Introduction to Web Development", avgGrade: 83.2, students: 18, assignments: 3 },
    { course: "Data Structures and Algorithms", avgGrade: 85.1, students: 22, assignments: 5 },
  ];

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Analytics</h1>
        <p className="text-muted-foreground text-lg">Track student performance and identify improvement areas</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalAssignments}</div>
            <p className="text-sm text-muted-foreground mt-1">Across all courses</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalStudents}</div>
            <p className="text-sm text-muted-foreground mt-1">Enrolled students</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Avg Grade</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.averageGrade}%</div>
            <p className="text-sm text-muted-foreground mt-1">Class average</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalSubmissions}</div>
            <p className="text-sm text-muted-foreground mt-1">Total graded</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Top Performers</CardTitle>
            <CardDescription className="text-base">Students with highest average grades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStudents.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.course}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{student.grade}%</p>
                    <p className="text-xs text-green-600">{student.trend}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Course Performance</CardTitle>
            <CardDescription className="text-base">Average grades by course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {coursePerformance.map((course, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{course.course}</p>
                    <p className="font-bold">{course.avgGrade}%</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{course.students} students</span>
                    <span>•</span>
                    <span>{course.assignments} assignments</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Overall Insights</CardTitle>
          <CardDescription className="text-base">Key metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
              <p className="text-2xl font-bold">{analytics.completionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Assignment completion across all courses</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">AI Grading Efficiency</p>
              <p className="text-2xl font-bold">82%</p>
              <p className="text-xs text-muted-foreground mt-1">Average AI grading accuracy</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Time Saved</p>
              <p className="text-2xl font-bold">24hrs</p>
              <p className="text-xs text-muted-foreground mt-1">Estimated time saved this month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
