import type { Metadata } from "next";
import { FadeIn } from "@/components/FadeIn";
import { getEducation } from "@/lib/content/education";
import { getSite } from "@/lib/content/site";
import { getExploring, getSkills } from "@/lib/content/skills";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "About",
    description: `About ${site.name} — ${site.tagline}`,
  };
}

export default function AboutPage() {
  const site = getSite();
  const skills = getSkills();
  const exploring = getExploring();
  const education = getEducation();

  return (
    <div>
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">About</h1>
        <p className="mt-6 text-base text-foreground leading-relaxed">
          {site.bio}
        </p>
        <p className="mt-4 text-base text-muted leading-relaxed">
          Based in {site.location}.
        </p>
      </FadeIn>

      <FadeIn delay={80} className="mt-14">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          Skills
        </h2>
        <dl className="mt-6 space-y-5">
          {skills.map((group) => (
            <div key={group.category}>
              <dt className="text-sm font-medium text-foreground">
                {group.category}
              </dt>
              <dd className="mt-1 text-sm text-muted leading-relaxed">
                {group.items.join(", ")}
              </dd>
            </div>
          ))}
        </dl>
      </FadeIn>

      {exploring.length > 0 && (
        <FadeIn delay={120} className="mt-14">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Currently exploring
          </h2>
          <p className="mt-4 text-sm text-muted leading-relaxed">
            {exploring.join(" · ")}
          </p>
        </FadeIn>
      )}

      <FadeIn delay={160} className="mt-14">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          Education
        </h2>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          Formal foundation in software engineering before moving into backend
          systems work.
        </p>
        <div className="mt-6 space-y-4">
          {education.map((item) => (
            <div key={item.school}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  {item.school}
                </h3>
                <span className="text-sm text-muted tabular-nums">
                  {item.start} – {item.end}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {item.degree}
                {item.detail ? ` — ${item.detail}` : ""}
              </p>
              <p className="text-sm text-muted">{item.location}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
