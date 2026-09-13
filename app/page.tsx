import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { ProjectEntry } from "@/components/ProjectEntry";
import { getExperience } from "@/lib/content/experience";
import {
  getFeaturedHighlights,
  getPortfolioProjects,
} from "@/lib/content/projects";
import { getSite } from "@/lib/content/site";
import { getAllPosts } from "@/lib/posts";

export default function HomePage() {
  const site = getSite();
  const workProjects = getFeaturedHighlights();
  const personalProjects = getPortfolioProjects().slice(0, 2);
  const roles = getExperience();
  const recentPosts = getAllPosts()
    .filter((post) => post.published)
    .slice(0, 2);

  return (
    <div>
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {site.name}
        </h1>
        <p className="mt-2 text-base text-muted">{site.currently}</p>
        <p className="mt-4 text-base text-foreground leading-relaxed text-balance">
          {site.tagline}
        </p>
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
          <a
            href={`mailto:${site.email}`}
            className="hover:text-accent transition-colors"
          >
            Email
          </a>
          <a
            href={site.links.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            Resume
          </a>
          <a
            href={site.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            GitHub
          </a>
          <a
            href={site.links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            LinkedIn
          </a>
          <Link href="/blog" className="hover:text-accent transition-colors">
            Blog
          </Link>
          <a
            href={site.links.leetcode}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            LeetCode
          </a>
        </div>
      </FadeIn>

      <FadeIn delay={80} className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Experience
          </h2>
          <Link
            href="/experience"
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            Full experience →
          </Link>
        </div>
        <div className="mt-2">
          {roles.map((role) => (
            <article
              key={`${role.company}-${role.role}`}
              className="py-4 border-b border-border last:border-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-base font-medium text-foreground">
                  {role.role} · {role.company}
                </h3>
                <span className="text-sm text-muted tabular-nums whitespace-nowrap">
                  {role.start} – {role.end}
                </span>
              </div>
            </article>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={140} className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Work
          </h2>
          <Link
            href="/projects"
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            All work →
          </Link>
        </div>
        <div className="mt-2">
          {workProjects.map((project) => (
            <ProjectEntry
              key={project.name}
              project={project}
              compact
              hideYear
            />
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={200} className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Blog
          </h2>
          <Link
            href="/blog"
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            All posts →
          </Link>
        </div>
        <div className="mt-2">
          {recentPosts.length === 0 ? (
            <p className="py-4 text-sm text-muted">No posts yet.</p>
          ) : (
            recentPosts.map((post) => (
              <article
                key={post.slug}
                className="py-4 border-b border-border last:border-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-base font-medium text-foreground">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-accent transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <time
                    dateTime={post.date}
                    className="text-sm text-muted tabular-nums whitespace-nowrap"
                  >
                    {formatHomeDate(post.date)}
                  </time>
                </div>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">
                  {post.excerpt}
                </p>
              </article>
            ))
          )}
        </div>
      </FadeIn>

      <FadeIn delay={260} className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Personal
          </h2>
          <Link
            href="/projects"
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            All projects →
          </Link>
        </div>
        <div className="mt-2">
          {personalProjects.map((project) => (
            <ProjectEntry key={project.name} project={project} compact />
          ))}
        </div>
      </FadeIn>
    </div>
  );
}

function formatHomeDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
