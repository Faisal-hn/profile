import fs from "fs";
import path from "path";

const DEFAULT_VAULT_WEBSITE =
  "/home/tracxn-lp-703/Obsidian Vault/Website";

/**
 * Content root for Markdown notes.
 * - Local: set CONTENT_DIR to Brain2.0 Website/ (see .env.local)
 * - Vercel / default: ./content in this repo (Git mirror)
 */
export function getContentRoot(): string {
  const fromEnv = process.env.CONTENT_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.join(process.cwd(), "content");
}

export function contentPath(...segments: string[]): string {
  return path.join(getContentRoot(), ...segments);
}

export function isMarkdownFile(filename: string): boolean {
  return filename.endsWith(".md") || filename.endsWith(".mdx");
}

export function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir).filter(isMarkdownFile).sort();
}

/** Parse "- item" / "* item" lines from markdown body into strings. */
export function parseBulletList(body: string): string[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  throw new Error(`Missing or invalid frontmatter field: ${field}`);
}

export { DEFAULT_VAULT_WEBSITE };
