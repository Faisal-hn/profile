import Link from "next/link";
import { getSite } from "@/lib/content/site";

export default function NotFound() {
  const site = getSite();

  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm text-muted">
        That page does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-muted hover:text-accent transition-colors"
      >
        ← Back to {site.name}
      </Link>
    </div>
  );
}
