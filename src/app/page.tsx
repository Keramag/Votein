import Link from "next/link";
import { currentUser, localToday } from "@/lib/auth";
import { metaFor } from "@/lib/exercises";
import { activeSplit, suggestedDay } from "@/lib/splits";
import { listWorkouts, recentPrs } from "@/lib/workouts";
import { fmtDate, fmtWeight } from "@/lib/units";
import StartWorkoutButton from "@/components/StartWorkoutButton";

export default async function Home() {
  const user = await currentUser();
  const date = await localToday();
  const unit = user?.unit ?? "kg";
  const split = user ? activeSplit(user.id) : null;
  const dayIndex = user && split ? suggestedDay(user.id, split, date) : null;
  const day = split && dayIndex !== null ? split.data.days[dayIndex] : null;
  const workouts = user ? listWorkouts(user.id, 20) : [];
  const inProgress = workouts.find((w) => !w.finished);
  const recent = workouts.filter((w) => w.finished).slice(0, 3);
  const prs = user ? recentPrs(user.id, 4) : [];
  const meta = metaFor([...(day?.items.map((i) => i.exerciseId) ?? []), ...prs.map((p) => p.exerciseId)]);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="muted text-sm">{fmtDate(date)}</p>
      </header>

      {inProgress && (
        <section className="card border-emerald-600/40 p-4">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Workout in progress</p>
          <p className="font-semibold">{inProgress.name || "Untitled workout"}</p>
          <Link href={`/workouts/${inProgress.id}`} className="btn btn-primary mt-3">
            Continue
          </Link>
        </section>
      )}

      <section className="card p-4">
        {split && day ? (
          <>
            <p className="muted text-sm">{split.name}</p>
            <h2 className="text-lg font-semibold">{day.name}</h2>
            <ul className="muted my-2 space-y-0.5 text-sm">
              {day.items.slice(0, 6).map((it, i) => (
                <li key={i} className="truncate capitalize">
                  {it.sets} × {it.reps} · {meta[it.exerciseId]?.name}
                </li>
              ))}
              {day.items.length > 6 && <li>+ {day.items.length - 6} more</li>}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <StartWorkoutButton splitId={split.id} dayIndex={dayIndex!} label={`Start ${day.name}`} />
              <StartWorkoutButton label="Empty workout" primary={false} />
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">{split ? "Rest day" : "No active split"}</h2>
            <p className="muted mb-3 text-sm">
              {split ? `Nothing scheduled in ${split.name} today.` : "Generate a program or design your own split to get a daily plan."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StartWorkoutButton label="Start empty workout" />
              {!split && (
                <>
                  <Link href="/generate" className="btn">
                    Generate program
                  </Link>
                  <Link href="/splits/new" className="btn">
                    Design split
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </section>

      {prs.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Recent records 🏆</h2>
          <ul className="space-y-1 text-sm">
            {prs.map((p, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate capitalize">{meta[p.exerciseId]?.name}</span>
                <span className="muted shrink-0">
                  {fmtWeight(p.weight, unit)} × {p.reps} · {fmtDate(p.date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Recent workouts</h2>
            <Link href="/workouts" className="muted text-sm">
              All →
            </Link>
          </div>
          <ul className="space-y-2">
            {recent.map((w) => (
              <li key={w.id}>
                <Link href={`/workouts/${w.id}`} className="card block p-3">
                  <p className="font-medium">{w.name || "Workout"}</p>
                  <p className="muted text-sm">
                    {fmtDate(w.date)} · {w.sets} sets
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
