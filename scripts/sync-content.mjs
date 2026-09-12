import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultSource = "/home/tracxn-lp-703/Obsidian Vault/Website";
const dest = path.join(repoRoot, "content");
const publicBlog = path.join(repoRoot, "public", "blog");
const mediaExts = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
]);

function loadEnvLocal() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === ".obsidian" || entry.name === ".trash") continue;
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      fs.unlinkSync(full);
    }
  }
}

loadEnvLocal();

const source = path.resolve(
  process.env.CONTENT_DIR?.trim() || defaultSource,
);

if (!fs.existsSync(source)) {
  console.error(`Content source not found: ${source}`);
  console.error(
    "Create Website/ in your Obsidian vault or set CONTENT_DIR in .env.local",
  );
  process.exit(1);
}

emptyDir(dest);
copyDir(source, dest);

/** Markdown uses `/blog/file.png` → files must live in `public/blog/`. */
function syncBlogMedia() {
  const blogSrc = path.join(source, "blog");
  fs.mkdirSync(publicBlog, { recursive: true });
  if (!fs.existsSync(blogSrc)) {
    return 0;
  }
  let count = 0;
  for (const entry of fs.readdirSync(blogSrc, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!mediaExts.has(ext)) continue;
    fs.copyFileSync(
      path.join(blogSrc, entry.name),
      path.join(publicBlog, entry.name),
    );
    count += 1;
  }
  return count;
}

const mediaCount = syncBlogMedia();

console.log(`Synced:\n  ${source}\n→ ${dest}`);
if (mediaCount > 0) {
  console.log(`Blog media: ${mediaCount} file(s) → ${publicBlog}`);
}
