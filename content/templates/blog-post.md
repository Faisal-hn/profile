---
title: "{{title}}"
date: "{{date}}"
excerpt: "One-line summary for the blog index."
tags: []
published: false
---

Write your post here.

- Use normal Markdown links: `[text](https://example.com)` — not `[[wikilinks]]`
- Images: put files in `Website/blog/` next to the post (or `public/blog/`), reference as `![Alt](/blog/filename.png)` — **not** `![[wikilinks]]`. `npm run sync:content` copies blog images into `public/blog/`.
- Tables: use GitHub-flavored Markdown pipe tables

```md
| Column | Value |
| ------ | ----- |
| Latency | 2s |
```

- Set `published: true` when ready; then `npm run sync:content` → commit → push
- Filename becomes the URL slug (`my-post.md` → `/blog/my-post`)
