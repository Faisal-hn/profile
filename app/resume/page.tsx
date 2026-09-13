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
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Open PDF
            </a>
            <a
              href="/resume.pdf"
              download={`${site.name.replace(/\s+/g, "_")}_Resume.pdf`}
              className="hover:text-accent transition-colors"
            >
              Download →
            </a>
          </div>
        </div>

        {/* Break out of the site’s max-w-2xl so the PDF isn’t tiny */}
        <div className="relative left-1/2 mt-6 w-screen -translate-x-1/2 px-4 sm:px-8">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-md border border-border bg-background">
            <iframe
              title={`${site.name} resume`}
              src="/resume.pdf#navpanes=0&view=FitH"
              className="block h-[calc(100vh-11rem)] min-h-[36rem] w-full"
            />
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
