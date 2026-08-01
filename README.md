# Faisal Hassan — Portfolio & Blog

Personal site built with **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, and Markdown edited in **Obsidian**.

- **Live:** https://profile-omega-gilt.vercel.app  
- **Repo:** https://github.com/Faisal-hn/profile

## Local development

```bash
cp .env.example .env.local   # once — points CONTENT_DIR at Obsidian Website/
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build          # production build (uses ./content; leave CONTENT_DIR unset on Vercel)
npm run start
npm run sync:content   # copy Website/ → ./content before git push
```

Optional: set `NEXT_PUBLIC_SITE_URL` (e.g. `https://your-domain.com`) for sitemap / Open Graph.

---

## Publish guide

### Mental model

| Place | Role |
|-------|------|
| `Obsidian Vault/Website/` | Edit site content (Obsidian Sync) |
| `PROJECTS/profile/content/` | Git mirror Vercel builds from |
| GitHub `Faisal-hn/profile` | Source for Vercel |
| Vercel | Live site |

```text
Edit Website/ in Obsidian
  → npm run sync:content   (copies Website/ → ./content/)
  → git commit + push
  → Vercel redeploys
```

`npm run sync:content` empties `content/`, then copies your Obsidian `Website/` tree into it (skips `.obsidian` / `.trash`). It does **not** commit or deploy by itself.

### Publish any content change

After editing `Website/` (site, skills, experience, projects, education, blog):

```bash
cd ~/PROJECTS/profile
npm run sync:content
git add content
git status
git commit -m "content: describe your change"
git push
```

Vercel rebuilds from `main`. Check Deployments in the dashboard if the live site hasn’t updated yet.

### Add a new blog post

1. In Obsidian, create a note under `Website/blog/` (template: `Website/templates/blog-post.md`).
2. **Filename = URL slug** — `my-post.md` → `/blog/my-post`.
3. Frontmatter:

```yaml
---
title: "Post title"
date: "2026-08-02"
excerpt: "One-line summary for the blog index."
tags: [auth, spring]
published: false
---
```

4. Write the body in normal Markdown.
   - Links: `[text](https://example.com)` — **not** `[[wikilinks]]`
   - Images: put files in `public/blog/` and reference `/blog/filename.png`
5. When ready, set `published: true`.
6. Run the publish commands above (`sync:content` → commit → push).

| `published` | Production (Vercel) |
|-------------|---------------------|
| `false` | Hidden |
| `true` | Live on `/blog` |

### Update an existing post or page

Edit the note under `Website/`, then sync → commit → push. No extra republish step.

### What to edit where

| Edit… | Path |
|-------|------|
| Name, tagline, bio, links | `Website/site.md` |
| Skills / exploring | `Website/skills.md` |
| Experience | `Website/experience/` |
| Projects | `Website/projects/` |
| Education | `Website/education/` |
| Blog | `Website/blog/` |
| Templates | `Website/templates/` |

**Not** via Website notes (edit in this repo, then `git add` / commit / push — no sync needed):

- Resume PDF → `public/resume.pdf`
- Blog images → `public/blog/`
- Site code / design → `app/`, `components/`, etc.

### Vercel

- Do **not** set `CONTENT_DIR` on Vercel (it must use repo `./content`).
- `NEXT_PUBLIC_SITE_URL` is optional; set it when you add a custom domain.
- Custom domain: Vercel → project → **Domains**.

---

## Content architecture

| Location | Role |
|----------|------|
| **`Obsidian Vault/Website/`** | Edit here (Obsidian Sync) |
| **`content/` in this repo** | Git mirror for Vercel (committed) |

Local `npm run dev` reads `CONTENT_DIR` from `.env.local` (the Website folder).  
Vercel builds from `./content`.

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

## License

Personal portfolio — all rights reserved.
