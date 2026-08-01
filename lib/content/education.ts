import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  contentPath,
  listMarkdownFiles,
  optionalString,
  requireString,
} from "./utils";

export type Education = {
  school: string;
  location: string;
  degree: string;
  start: string;
  end: string;
  detail?: string;
  order: number;
};

function parseEducationFile(fullPath: string): Education {
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data } = matter(raw);

  return {
    school: requireString(data.school, "school"),
    location: requireString(data.location, "location"),
    degree: requireString(data.degree, "degree"),
    start: String(data.start ?? ""),
    end: String(data.end ?? ""),
    detail: optionalString(data.detail),
    order: typeof data.order === "number" ? data.order : 999,
  };
}

export function getEducation(): Education[] {
  const dir = contentPath("education");
  return listMarkdownFiles(dir)
    .map((file) => parseEducationFile(path.join(dir, file)))
    .sort((a, b) => a.order - b.order);
}
