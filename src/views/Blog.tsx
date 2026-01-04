import dynamic from "next/dynamic";

const BlogPostsGrid = dynamic(() => import("@/components/Blog/BlogPostsGrid"), {
  ssr: false,
});

export default function BlogPage() {
  return (
    <div className="overflow-x-hidden bg-background">
      <section className="min-h-screen flex items-center">
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20 w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Blog</h1>
            <p className="text-lg text-muted-foreground">
              Tips, guides, and insights for healthier eating
            </p>
          </div>

          <BlogPostsGrid />
        </div>
      </section>
    </div>
  );
}