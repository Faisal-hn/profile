import type { Metadata } from "next";
import { ExperienceEntry } from "@/components/ExperienceEntry";
import { FadeIn } from "@/components/FadeIn";
import { getExperience } from "@/lib/content/experience";
import { getSite } from "@/lib/content/site";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Experience",
    description: `Work experience — ${site.name}`,
  };
}

export default function ExperiencePage() {
  const experience = getExperience();

  return (
    <div>
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Experience</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Backend work across auth, payments, and data infrastructure.
        </p>
        <div className="mt-6">
          {experience.map((role) => (
            <ExperienceEntry key={`${role.company}-${role.role}`} role={role} />
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
