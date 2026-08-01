import type { Experience } from "@/lib/content/experience";

export function ExperienceEntry({ role }: { role: Experience }) {
  return (
    <article className="py-8 border-b border-border last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-medium text-foreground">
          {role.role} · {role.company}
        </h2>
        <span className="text-sm text-muted tabular-nums whitespace-nowrap">
          {role.start} – {role.end}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{role.location}</p>
      <ul className="mt-4 space-y-2 text-sm text-foreground leading-relaxed list-disc pl-5">
        {role.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">{role.tech}</p>
    </article>
  );
}
