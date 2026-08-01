# Faisal Hassan — Portfolio & Blog

Personal site built with **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, and Markdown edited in **Obsidian** (Brain2.0 vault).

## Local development

```bash
cp .env.example .env.local   # once — points CONTENT_DIR at Brain2.0 Website/
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build (uses ./content mirror; leave CONTENT_DIR unset on Vercel)
npm run start
npm run sync:content   # copy Website/ → ./content before git push
```

Optional: set `NEXT_PUBLIC_SITE_URL` (e.g. `https://your-domain.com`) for sitemap / Open Graph.

## Content architecture

| Location | Role |
|----------|------|
| **`Obsidian Vault/Website/`** | Edit here (Obsidian Sync — one vault) |
| **`PROJECTS/profile/content/`** | Git mirror for Vercel (committed) |

```text
Edit in Brain2.0 Website/
  → Obsidian Sync (backup / phone)
  → npm run sync:content
  → git add content && git push
  → Vercel rebuilds
```

Local `npm run dev` reads `CONTENT_DIR` from `.env.local` (the Website folder).  
Vercel builds from the repo’s `./content` (do **not** set `CONTENT_DIR` in Vercel).

## Project layout

| Path | Purpose |
|------|---------|
| `app/` | Routes |
| `content/` | Git mirror of Website/ (for production) |
| `lib/content/` | Portfolio Markdown loaders |
| `lib/posts.ts` | Blog loader |
| `scripts/sync-content.mjs` | Website/ → content/ copy |
| `public/resume.pdf` | Resume PDF |
| `public/blog/` | Post images |

## Editing in Obsidian (Brain2.0)

Open your existing vault (`Obsidian Vault`). All site notes live under **`Website/`**:

| Edit… | Path under Website/ |
|-------|---------------------|
| Name, tagline, bio, contact, links | `site.md` |
| Skills / currently exploring | `skills.md` |
| Education | `education/` |
| Experience | `experience/` |
| Projects / home highlights | `projects/` |
| Blog posts | `blog/` |
| Templates | `templates/` |

**Publish after editing:**

```bash
cd ~/PROJECTS/profile
npm run sync:content
git add content
git commit -m "content: update site"
git push
```

**Skills:** YAML `groups` in `skills.md`. Optional `exploring:` list (1–4 items) on About; `[]` hides it.

**Resume PDF / post images:** still update files in this repo (`public/resume.pdf`, `public/blog/`) — not via Website notes.

## New blog post

1. In Obsidian, create a note under `Website/blog/` (template: `blog-post`).
2. Frontmatter:

```yaml
---
title: "Post title"
date: "2026-08-01"
excerpt: "One-line summary for the blog index."
tags: [auth, spring]
published: false
---
```

3. Filename = URL slug (`my-post.md` → `/blog/my-post`).
4. Set `published: true` when ready.
5. `npm run sync:content` → commit `content/` → push.

Use normal Markdown links `[text](url)`, not `[[wikilinks]]`. Drafts (`published: false`) are hidden in production.

## Deploy on Vercel

1. Push this repo to GitHub.
2. [Vercel](https://vercel.com) → import the repo → Next.js defaults.
3. Do **not** set `CONTENT_DIR` on Vercel.
4. After content edits: always `sync:content` + push so `content/` is up to date.

### Custom domain (later)

1. Vercel → **Settings** → **Domains**.
2. Set `NEXT_PUBLIC_SITE_URL` to `https://your-domain.com` and redeploy.

## License

Personal portfolio — all rights reserved.
