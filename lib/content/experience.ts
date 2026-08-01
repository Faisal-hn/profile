import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  contentPath,
  listMarkdownFiles,
  optionalString,
  parseBulletList,
  requireString,
} from "./utils";

export type Experience = {
  company: string;
  location: string;
  role: string;
  start: string;
  end: string;
  bullets: string[];
  tech: string;
  summary?: string;
  order: number;
};

function parseExperienceFile(fullPath: string): Experience {
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);

  return {
    company: requireString(data.company, "company"),
    location: requireString(data.location, "location"),
    role: requireString(data.role, "role"),
    start: requireString(data.start, "start"),
    end: requireString(data.end, "end"),
    tech: requireString(data.tech, "tech"),
    summary: optionalString(data.summary),
    order: typeof data.order === "number" ? data.order : 999,
    bullets: parseBulletList(content),
  };
}

export function getExperience(): Experience[] {
  const dir = contentPath("experience");
  return listMarkdownFiles(dir)
    .map((file) => parseExperienceFile(path.join(dir, file)))
    .sort((a, b) => a.order - b.order);
}
