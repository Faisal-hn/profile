import { ExternalLink } from "lucide-react";
import type { Project } from "@/lib/content/projects";

type Props = {
  project: Project;
  /** Home teaser: name, year, one-line description only */
  compact?: boolean;
  /** Hide year (e.g. work highlights on home) */
  hideYear?: boolean;
};

export function ProjectEntry({
  project,
  compact = false,
  hideYear = false,
}: Props) {
  if (compact) {
    return (
      <article className="py-4 border-b border-border last:border-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-base font-medium text-foreground">{project.name}</h3>
          {!hideYear && (
            <span className="text-sm text-muted tabular-nums">{project.year}</span>
          )}
        </div>
        <p className="mt-1.5 text-sm text-muted leading-relaxed">
          {project.description}
        </p>
      </article>
    );
  }

  return (
    <article className="py-6 border-b border-border last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-medium text-foreground">{project.name}</h3>
        {!hideYear && (
          <span className="text-sm text-muted tabular-nums">{project.year}</span>
        )}
      </div>

      <p className="mt-2 text-sm text-foreground leading-relaxed">
        {project.description}
      </p>

      {project.outcome && (
        <p className="mt-2 text-sm text-muted leading-relaxed">
          {project.outcome}
        </p>
      )}

      <p className="mt-2 text-sm text-muted">{project.tech}</p>

      {(project.repoUrl || project.liveUrl) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted hover:text-accent transition-colors"
            >
              GitHub
              <ExternalLink size={12} strokeWidth={1.5} />
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted hover:text-accent transition-colors"
            >
              Live
              <ExternalLink size={12} strokeWidth={1.5} />
            </a>
          )}
        </div>
      )}
    </article>
  );
}
