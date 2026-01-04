import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BlogPost = {
  id: number;
  title: string;
  excerpt: string;
  url: string;
  publishedAt: string;
  image: string | null;
};

export const useBlogPosts = (limit = 6) => {
  return useQuery<{ posts: BlogPost[] }, Error>({
    queryKey: ["blog-posts", limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `blog-feed?limit=${encodeURIComponent(limit)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (error) throw error as Error;
      return data as { posts: BlogPost[] };
    },
    staleTime: 1000 * 60 * 5,
  });
};


