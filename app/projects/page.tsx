import type { Metadata } from "next";
import { FadeIn } from "@/components/FadeIn";
import { ProjectEntry } from "@/components/ProjectEntry";
import {
  getFeaturedHighlights,
  getPortfolioProjects,
} from "@/lib/content/projects";
import { getSite } from "@/lib/content/site";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Projects",
    description: `Projects — ${site.name}`,
  };
}

export default function ProjectsPage() {
  const featuredHighlights = getFeaturedHighlights();
  const portfolioProjects = getPortfolioProjects();

  return (
    <div>
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Selected production work and personal builds.
        </p>

        <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-muted">
          At work
        </h2>
        <div className="mt-2">
          {featuredHighlights.map((project) => (
            <ProjectEntry key={project.name} project={project} hideYear />
          ))}
        </div>

        <h2 className="mt-12 text-sm font-medium uppercase tracking-wide text-muted">
          Personal
        </h2>
        <div className="mt-2">
          {portfolioProjects.map((project) => (
            <ProjectEntry key={project.name} project={project} />
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
