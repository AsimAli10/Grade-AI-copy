"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Pin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function ForumsClient() {
  const { toast } = useToast();
  const [forums, setForums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForums();
  }, []);

  const fetchForums = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/forums");
      const data = await response.json();

      if (response.ok) {
        setForums(data.forums || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load forums",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching forums:", error);
      toast({
        title: "Error",
        description: "Failed to load forums",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Forums</h1>
        <p className="text-muted-foreground text-lg">
          Course discussion channels and Google Classroom announcements
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Forums are automatically created when you sync your Google Classroom courses
        </p>
      </div>

      {loading ? (
        <div className="w-full px-6 py-8 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : forums.length === 0 ? (
        <Card className="shadow-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No forums yet</h3>
            <p className="text-muted-foreground text-center text-base">
              Forums are automatically created when you sync your Google Classroom courses.
              <br />
              Go to Dashboard to sync your courses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {forums.map((forum: any) => (
            <Card key={forum.id} className="cursor-pointer hover:shadow-md transition-all border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl">{forum.name}</CardTitle>
                  {forum.pinned && <Pin className="h-4 w-4 text-primary" />}
                </div>
                <CardDescription className="text-base">{forum.courseName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{forum.threadsCount}</span> {forum.threadsCount === 1 ? "thread" : "threads"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(forum.lastActivity).toLocaleDateString()}
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/forums/${forum.id}`}>View Forum</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

