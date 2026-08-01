import { getSite } from "@/lib/content/site";

export function Footer() {
  const site = getSite();

  return (
    <footer className="mt-24 border-t border-border pt-8 pb-4 text-sm text-muted">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <a href={`mailto:${site.email}`} className="hover:text-accent transition-colors">
          {site.email}
        </a>
        <a
          href={site.links.github}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent transition-colors"
        >
          GitHub
        </a>
        <a
          href={site.links.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent transition-colors"
        >
          LinkedIn
        </a>
      </div>
      <p className="mt-4 text-xs">
        © {new Date().getFullYear()} {site.name}
      </p>
    </footer>
  );
}
