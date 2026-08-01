import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { FadeIn } from "@/components/FadeIn";
import { mdxOptions } from "@/lib/mdx";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

type Props = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return { title: "Post not found" };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article>
      <FadeIn>
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            <time dateTime={post.date}>
              {new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {" · "}
            {post.readingTime}
            {post.tags.length > 0 && (
              <>
                {" · "}
                {post.tags.join(", ")}
              </>
            )}
          </p>
        </header>

        <div className="prose prose-neutral dark:prose-invert prose-headings:font-semibold prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-pre:bg-transparent prose-code:before:content-none prose-code:after:content-none max-w-none">
          <MDXRemote source={post.content} options={mdxOptions} />
        </div>
      </FadeIn>
    </article>
  );
}
