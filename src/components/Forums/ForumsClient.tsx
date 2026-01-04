"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Pin } from "lucide-react";

export default function ForumsClient() {
  // TODO: Fetch forums from API
  // For now, using dummy data
  const channels = [
    {
      id: "1",
      name: "General Discussion",
      courseName: "AP Computer Science A",
      courseId: "1",
      threadsCount: 12,
      pinned: true,
      lastActivity: "2024-02-19T10:30:00Z",
    },
    {
      id: "2",
      name: "Assignment Help",
      courseName: "AP Computer Science A",
      courseId: "1",
      threadsCount: 8,
      pinned: true,
      lastActivity: "2024-02-18T14:20:00Z",
    },
    {
      id: "3",
      name: "Code Review",
      courseName: "Introduction to Web Development",
      courseId: "2",
      threadsCount: 15,
      pinned: false,
      lastActivity: "2024-02-19T16:45:00Z",
    },
    {
      id: "4",
      name: "Project Showcase",
      courseName: "Introduction to Web Development",
      courseId: "2",
      threadsCount: 6,
      pinned: false,
      lastActivity: "2024-02-17T09:15:00Z",
    },
    {
      id: "5",
      name: "Algorithm Discussion",
      courseName: "Data Structures and Algorithms",
      courseId: "3",
      threadsCount: 10,
      pinned: true,
      lastActivity: "2024-02-19T11:30:00Z",
    },
  ];

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Forums</h1>
        <p className="text-muted-foreground text-lg">Course discussion channels and threads</p>
      </div>

      {channels.length === 0 ? (
        <Card className="shadow-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No forums yet</h3>
            <p className="text-muted-foreground text-center text-base">
              Forums will appear here once courses are connected
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel: any) => (
            <Card key={channel.id} className="cursor-pointer hover:shadow-md transition-all border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl">{channel.name}</CardTitle>
                  {channel.pinned && <Pin className="h-4 w-4 text-primary" />}
                </div>
                <CardDescription className="text-base">{channel.courseName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{channel.threadsCount}</span> threads
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(channel.lastActivity).toLocaleDateString()}
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  View Channel
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

