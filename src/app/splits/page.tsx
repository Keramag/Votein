import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listSplits } from "@/lib/splits";
import { WEEKDAYS } from "@/lib/program";

export const metadata: Metadata = { title: "Splits" };

export default async function SplitsPage() {
  const user = await currentUser();
  const splits = user ? listSplits(user.id) : [];
  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Splits</h1>
        <div className="flex gap-2">
          <Link href="/generate" className="btn">
            Generate
          </Link>
          <Link href="/splits/new" className="btn btn-primary">
            + New
          </Link>
        </div>
      </div>
      {splits.length === 0 && (
        <p className="muted card p-6 text-center text-sm">
          No splits yet. Design a weekly routine by hand, or let the generator build one from your volume targets.
        </p>
      )}
      <ul className="space-y-2">
        {splits.map((s) => (
          <li key={s.id}>
            <Link href={`/splits/${s.id}`} className="card block p-3 hover:border-stone-400 dark:hover:border-stone-600">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{s.name}</p>
                {s.active && (
                  <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Active
                  </span>
                )}
              </div>
              <p className="muted mt-1 text-sm">
                {s.data.days.map((d) => (d.weekday !== null ? `${WEEKDAYS[d.weekday]} ${d.name}` : d.name)).join(" · ")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
