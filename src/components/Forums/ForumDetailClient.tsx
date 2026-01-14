"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Reply, Send, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type ForumDetailClientProps = {
  forumId: string;
};

export default function ForumDetailClient({ forumId }: ForumDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [forum, setForum] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});

  const fetchForumData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch forum details
      const forumResponse = await fetch(`/api/forums`);
      const forumData = await forumResponse.json();
      
      if (forumResponse.ok) {
        const foundForum = forumData.forums?.find((f: any) => f.id === forumId);
        if (foundForum) {
          setForum(foundForum);
        }
      }

      // Fetch messages
      const messagesResponse = await fetch(`/api/forums/${forumId}/messages`);
      const messagesData = await messagesResponse.json();

      if (messagesResponse.ok) {
        setMessages(messagesData.messages || []);
      } else {
        toast({
          title: "Error",
          description: messagesData.error || "Failed to load messages",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching forum data:", error);
      toast({
        title: "Error",
        description: "Failed to load forum data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [forumId, toast]);

  useEffect(() => {
    fetchForumData();
  }, [fetchForumData]);

  const handlePostMessage = async () => {
    if (!newMessage.trim()) {
      toast({
        title: "Error",
        description: "Message content is required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forums/${forumId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Message posted successfully",
        });
        setNewMessage("");
        await fetchForumData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to post message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error posting message:", error);
      toast({
        title: "Error",
        description: "Failed to post message",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentMessageId: string) => {
    const content = replyContent[parentMessageId]?.trim();
    if (!content) {
      toast({
        title: "Error",
        description: "Reply content is required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forums/${forumId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
          parent_message_id: parentMessageId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Reply posted successfully",
        });
        setReplyContent({ ...replyContent, [parentMessageId]: "" });
        setReplyingTo(null);
        await fetchForumData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to post reply",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error posting reply:", error);
      toast({
        title: "Error",
        description: "Failed to post reply",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!forum) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-xl font-semibold mb-2">Forum not found</h3>
            <p className="text-muted-foreground">The forum you're looking for doesn't exist.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/forums">Back to Forums</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" className="mb-4" asChild>
          <Link href="/forums">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forums
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{forum.name}</h1>
        <p className="text-muted-foreground mt-1">
          {forum.courseName || "Organization Forum"}
        </p>
      </div>

      {/* Post New Message */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Post a Message</CardTitle>
          <CardDescription>Start a new discussion thread</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-message">Message</Label>
              <Textarea
                id="new-message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write your message here..."
                rows={4}
              />
            </div>
            <Button onClick={handlePostMessage} disabled={submitting || !newMessage.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post Message
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="space-y-6">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
              <p className="text-muted-foreground text-center">
                Be the first to start a discussion in this forum
              </p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message: any) => (
            <Card key={message.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(message.author?.full_name, message.author?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {message.author?.full_name || message.author?.email || "Unknown"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {new Date(message.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(replyingTo === message.id ? null : message.id)}
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      {message.replies && message.replies.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {message.replies.length} {message.replies.length === 1 ? "reply" : "replies"}
                        </span>
                      )}
                    </div>

                    {/* Reply Form */}
                    {replyingTo === message.id && (
                      <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                        <Label htmlFor={`reply-${message.id}`}>Your Reply</Label>
                        <Textarea
                          id={`reply-${message.id}`}
                          value={replyContent[message.id] || ""}
                          onChange={(e) =>
                            setReplyContent({
                              ...replyContent,
                              [message.id]: e.target.value,
                            })
                          }
                          placeholder="Write your reply..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReply(message.id)}
                            disabled={submitting || !replyContent[message.id]?.trim()}
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Posting...
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3 mr-2" />
                                Post Reply
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent({ ...replyContent, [message.id]: "" });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {message.replies && message.replies.length > 0 && (
                      <div className="mt-4 space-y-4 pl-6 border-l-2 border-muted">
                        {message.replies.map((reply: any) => (
                          <div key={reply.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(reply.author?.full_name, reply.author?.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {reply.author?.full_name || reply.author?.email || "Unknown"}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {new Date(reply.created_at).toLocaleDateString()}
                                </Badge>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

