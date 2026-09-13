import type { Metadata } from "next";
import { FadeIn } from "@/components/FadeIn";
import { getSite } from "@/lib/content/site";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Resume",
    description: `Resume — ${site.name}`,
  };
}

export default function ResumePage() {
  const site = getSite();

  return (
    <div>
      <FadeIn>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Resume</h1>
          <a
            href="/resume.pdf"
            download={`${site.name.replace(/\s+/g, "_")}_Resume.pdf`}
            className="text-sm text-muted hover:text-accent transition-colors"
          >
            Download PDF →
          </a>
        </div>

        <div className="mt-6 overflow-hidden rounded-md border border-border bg-background">
          <iframe
            title={`${site.name} resume`}
            src="/resume.pdf#view=FitH"
            className="h-[80vh] w-full"
          />
        </div>
      </FadeIn>
    </div>
  );
}
