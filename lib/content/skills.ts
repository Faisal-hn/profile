import fs from "fs";
import matter from "gray-matter";
import { contentPath } from "./utils";

export type SkillGroup = {
  category: string;
  items: string[];
};

export type SkillsContent = {
  groups: SkillGroup[];
  exploring: string[];
};

function parseGroups(value: unknown): SkillGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((group: unknown) => {
      if (!group || typeof group !== "object") {
        return null;
      }
      const g = group as { category?: unknown; items?: unknown };
      if (typeof g.category !== "string" || !Array.isArray(g.items)) {
        return null;
      }
      return {
        category: g.category,
        items: g.items.filter((item): item is string => typeof item === "string"),
      };
    })
    .filter((group: SkillGroup | null): group is SkillGroup => group !== null);
}

function parseExploring(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function getSkillsContent(): SkillsContent {
  const filePath = contentPath("skills.md");
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);

  return {
    groups: parseGroups(data.groups),
    exploring: parseExploring(data.exploring),
  };
}

export function getSkills(): SkillGroup[] {
  return getSkillsContent().groups;
}

export function getExploring(): string[] {
  return getSkillsContent().exploring;
}
