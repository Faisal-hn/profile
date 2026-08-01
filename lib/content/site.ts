import fs from "fs";
import matter from "gray-matter";
import { cache } from "react";
import { contentPath, optionalString, requireString } from "./utils";

export type Site = {
  name: string;
  role: string;
  currently: string;
  tagline: string;
  bio: string;
  contactBlurb: string;
  email: string;
  location: string;
  links: {
    github: string;
    linkedin: string;
    leetcode: string;
    resume: string;
  };
};

export const getSite = cache((): Site => {
  const filePath = contentPath("site.md");
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    name: requireString(data.name, "name"),
    role: requireString(data.role, "role"),
    currently: requireString(data.currently, "currently"),
    tagline: requireString(data.tagline, "tagline"),
    bio: content.trim(),
    contactBlurb: requireString(data.contactBlurb, "contactBlurb"),
    email: requireString(data.email, "email"),
    location: requireString(data.location, "location"),
    links: {
      github: requireString(data.github, "github"),
      linkedin: requireString(data.linkedin, "linkedin"),
      leetcode: requireString(data.leetcode, "leetcode"),
      resume: optionalString(data.resume) ?? "/resume.pdf",
    },
  };
});
