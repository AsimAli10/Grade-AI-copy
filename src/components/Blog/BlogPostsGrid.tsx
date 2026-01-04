"use client";

import { useBlogPosts, type BlogPost } from "@/hooks/useBlogPosts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Calendar } from "lucide-react";

export default function BlogPostsGrid() {
  const { data, isLoading, error } = useBlogPosts();

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          Failed to load blog posts. Please try again later.
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  const posts = data?.posts || [];

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No blog posts available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post: BlogPost) => (
        <Card key={post.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
          {post.image && (
            <div className="relative h-48 w-full overflow-hidden">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide image on error
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="line-clamp-2">{post.title}</CardTitle>
            {post.excerpt && (
              <CardDescription className="line-clamp-3">
                {post.excerpt}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
              >
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Read More
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

