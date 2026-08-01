import type { Metadata } from "next";
import { FadeIn } from "@/components/FadeIn";
import { getSite } from "@/lib/content/site";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Contact",
    description: `Contact ${site.name}`,
  };
}

export default function ContactPage() {
  const site = getSite();

  return (
    <div>
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Contact</h1>
        <p className="mt-6 text-base text-foreground leading-relaxed">
          {site.contactBlurb}
        </p>
        <div className="mt-8 flex flex-col gap-3 text-sm text-muted">
          <a
            href={`mailto:${site.email}`}
            className="hover:text-accent transition-colors"
          >
            {site.email}
          </a>
          <a
            href={site.links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            LinkedIn
          </a>
          <a
            href={site.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            GitHub
          </a>
        </div>
      </FadeIn>
    </div>
  );
}
