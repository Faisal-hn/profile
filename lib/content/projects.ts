import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  contentPath,
  listMarkdownFiles,
  optionalString,
  requireString,
} from "./utils";

export type Project = {
  name: string;
  description: string;
  year: string;
  tech: string;
  outcome?: string;
  metric?: string;
  repoUrl?: string;
  liveUrl?: string;
  featured?: boolean;
  kind?: "project" | "highlight";
  order: number;
};

function parseProjectFile(fullPath: string): Project {
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  const kind =
    data.kind === "highlight" || data.kind === "project"
      ? data.kind
      : "project";

  return {
    name: requireString(data.name, "name"),
    description: content.trim(),
    year: String(data.year ?? ""),
    tech: requireString(data.tech, "tech"),
    outcome: optionalString(data.outcome),
    metric: optionalString(data.metric),
    repoUrl: optionalString(data.repoUrl),
    liveUrl: optionalString(data.liveUrl),
    featured: Boolean(data.featured),
    kind,
    order: typeof data.order === "number" ? data.order : 999,
  };
}

export function getProjects(): Project[] {
  const dir = contentPath("projects");
  return listMarkdownFiles(dir)
    .map((file) => parseProjectFile(path.join(dir, file)))
    .sort((a, b) => a.order - b.order);
}

export function getFeaturedHighlights(): Project[] {
  return getProjects().filter((p) => p.featured && p.kind === "highlight");
}

export function getPortfolioProjects(): Project[] {
  return getProjects().filter((p) => p.kind === "project");
}
