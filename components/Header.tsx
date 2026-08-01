import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/experience", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="mb-12 flex flex-wrap items-center justify-between gap-4">
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:text-accent transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
