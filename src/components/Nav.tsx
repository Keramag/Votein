"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/workouts", label: "Workouts", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/splits", label: "Splits", icon: "M4 5h16v4H4zM4 11h16v4H4zM4 17h10v2H4z" },
  { href: "/generate", label: "Generate", icon: "M13 2L4 14h7l-1 8 9-12h-7z" },
  { href: "/records", label: "Records", icon: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" },
  { href: "/exercises", label: "Library", icon: "M5 4h4v16H5zM15 4h4v16h-4zM9 10h6v4H9z" },
];

export default function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <header className="sticky top-0 z-20 hidden border-b border-stone-200 bg-background/90 backdrop-blur md:block dark:border-stone-800">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-2">
          <Link href="/" className="mr-4 text-lg font-bold text-emerald-600">
            Votein
          </Link>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                active(l.href)
                  ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                  : "muted hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/settings" className="muted ml-auto text-sm hover:text-foreground">
            Settings
          </Link>
        </nav>
      </header>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-stone-200 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-stone-800"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              active(l.href) ? "text-emerald-600 dark:text-emerald-400" : "muted"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={l.icon} />
            </svg>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
