import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { metaFor } from "@/lib/exercises";
import { listWorkouts } from "@/lib/workouts";
import { fmtDate, toDisplay } from "@/lib/units";
import StartWorkoutButton from "@/components/StartWorkoutButton";

export const metadata: Metadata = { title: "Workouts" };

const PAGE = 30;

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const user = await currentUser();
  const unit = user?.unit ?? "kg";
  const list = user ? listWorkouts(user.id, PAGE + 1, (page - 1) * PAGE) : [];
  const more = list.length > PAGE;
  const shown = list.slice(0, PAGE);
  const meta = metaFor(shown.flatMap((w) => w.exerciseIds));

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <StartWorkoutButton label="+ New" />
      </div>
      {shown.length === 0 && page === 1 && (
        <p className="muted card p-6 text-center text-sm">No workouts yet. Start one to begin your history.</p>
      )}
      <ul className="space-y-2">
        {shown.map((w) => (
          <li key={w.id}>
            <Link href={`/workouts/${w.id}`} className="card block p-3 hover:border-stone-400 dark:hover:border-stone-600">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-medium">{w.name || "Workout"}</p>
                <p className="muted shrink-0 text-sm">{fmtDate(w.date)}</p>
              </div>
              <p className="muted truncate text-sm capitalize">
                {w.exerciseIds.slice(0, 4).map((id) => meta[id]?.name).join(", ")}
                {w.exerciseIds.length > 4 && ` +${w.exerciseIds.length - 4}`}
              </p>
              <p className="muted mt-1 text-xs">
                {w.finished ? "" : "In progress · "}
                {w.sets} sets · {Math.round(toDisplay(w.volume, unit)).toLocaleString("en-US")} {unit} volume
                {w.minutes ? ` · ${w.minutes} min` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <nav className="mt-4 flex justify-between text-sm">
        {page > 1 ? <Link href={`/workouts?page=${page - 1}`}>← Newer</Link> : <span />}
        {more && <Link href={`/workouts?page=${page + 1}`}>Older →</Link>}
      </nav>
    </main>
  );
}
