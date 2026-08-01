import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { getSite } from "@/lib/content/site";
import { getAllPosts } from "@/lib/posts";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Blog",
    description: `Writing by ${site.name}`,
  };
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div>
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <p className="mt-2 text-sm text-muted">
          Notes on backend systems, auth, and performance.
        </p>

        {posts.length === 0 ? (
          <p className="mt-10 text-sm text-muted">No posts yet.</p>
        ) : (
          <ul className="mt-8 divide-y divide-border">
            {posts.map((post) => (
              <li key={post.slug} className="py-5">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block hover:text-accent transition-colors"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="text-base font-medium text-foreground group-hover:text-accent transition-colors">
                      {post.title}
                      {!post.published && (
                        <span className="ml-2 text-xs font-normal text-muted">
                          (draft)
                        </span>
                      )}
                    </h2>
                    <time
                      dateTime={post.date}
                      className="text-sm text-muted tabular-nums"
                    >
                      {formatDate(post.date)}
                    </time>
                  </div>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    {post.excerpt}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {post.tags.join(", ")}
                    {post.tags.length > 0 ? " · " : ""}
                    {post.readingTime}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FadeIn>
    </div>
  );
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
