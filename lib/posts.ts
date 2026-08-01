import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { contentPath, isMarkdownFile } from "@/lib/content/utils";

export type PostFrontmatter = {
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  published: boolean;
};

export type PostMeta = PostFrontmatter & {
  slug: string;
  readingTime: string;
};

export type Post = PostMeta & {
  content: string;
};

function getPostsDirectory(): string {
  return contentPath("blog");
}

function estimateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.mdx?$/, "");
}

function parsePost(filename: string): Post | null {
  const fullPath = path.join(getPostsDirectory(), filename);
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  if (typeof data.title !== "string" || typeof data.excerpt !== "string") {
    return null;
  }

  const dateValue = data.date;
  let date: string;
  if (typeof dateValue === "string") {
    date = dateValue.slice(0, 10);
  } else if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    date = dateValue.toISOString().slice(0, 10);
  } else {
    return null;
  }

  const tags = Array.isArray(data.tags)
    ? data.tags.filter((t): t is string => typeof t === "string")
    : [];

  return {
    slug: slugFromFilename(filename),
    title: data.title,
    date,
    excerpt: data.excerpt,
    tags,
    published: Boolean(data.published),
    readingTime: estimateReadingTime(content),
    content,
  };
}

function includeDrafts(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function getPostSlugs(): string[] {
  const postsDirectory = getPostsDirectory();
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  return fs
    .readdirSync(postsDirectory)
    .filter(isMarkdownFile)
    .map(slugFromFilename);
}

export function getAllPosts(): PostMeta[] {
  const postsDirectory = getPostsDirectory();
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const showDrafts = includeDrafts();

  return fs
    .readdirSync(postsDirectory)
    .filter(isMarkdownFile)
    .map(parsePost)
    .filter((post): post is Post => post !== null)
    .filter((post) => post.published || showDrafts)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(
      (post): PostMeta => ({
        slug: post.slug,
        title: post.title,
        date: post.date,
        excerpt: post.excerpt,
        tags: post.tags,
        published: post.published,
        readingTime: post.readingTime,
      }),
    );
}

export function getPostBySlug(slug: string): Post | null {
  const postsDirectory = getPostsDirectory();
  if (!fs.existsSync(postsDirectory)) {
    return null;
  }

  const mdPath = path.join(postsDirectory, `${slug}.md`);
  const mdxPath = path.join(postsDirectory, `${slug}.mdx`);
  const filename = fs.existsSync(mdPath)
    ? `${slug}.md`
    : fs.existsSync(mdxPath)
      ? `${slug}.mdx`
      : null;

  if (!filename) {
    return null;
  }

  const post = parsePost(filename);
  if (!post) {
    return null;
  }

  if (!post.published && !includeDrafts()) {
    return null;
  }

  return post;
}
