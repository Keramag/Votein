import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { metaFor } from "@/lib/exercises";
import { personalRecords } from "@/lib/workouts";
import { fmtDate, toDisplay } from "@/lib/units";

export const metadata: Metadata = { title: "Records" };

export default async function RecordsPage() {
  const user = await currentUser();
  const unit = user?.unit ?? "kg";
  const records = user ? personalRecords(user.id) : [];
  const meta = metaFor(records.map((r) => r.exerciseId));

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Personal records</h1>
      {records.length === 0 ? (
        <p className="muted card p-6 text-center text-sm">
          Complete sets in a workout (tick ✓) and your best lifts will show up here.
        </p>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.exerciseId} className="card p-3">
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/exercises/${r.exerciseId}`} className="truncate font-medium capitalize">
                  {meta[r.exerciseId]?.name ?? r.exerciseId}
                </Link>
                <span className="muted shrink-0 text-xs">
                  {r.sessions} session{r.sessions === 1 ? "" : "s"}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                {r.weight && (
                  <div>
                    <dt className="muted text-xs">Heaviest</dt>
                    <dd className="font-semibold">
                      {toDisplay(r.weight.value, unit)} {unit} × {r.weight.reps}
                    </dd>
                    <dd className="muted text-xs">{fmtDate(r.weight.date)}</dd>
                  </div>
                )}
                {r.e1rm && (
                  <div>
                    <dt className="muted text-xs">Est. 1RM</dt>
                    <dd className="font-semibold">
                      {toDisplay(r.e1rm.value, unit)} {unit}
                    </dd>
                    <dd className="muted text-xs">{fmtDate(r.e1rm.date)}</dd>
                  </div>
                )}
                {r.reps && (
                  <div>
                    <dt className="muted text-xs">Most reps (BW)</dt>
                    <dd className="font-semibold">{r.reps.value}</dd>
                    <dd className="muted text-xs">{fmtDate(r.reps.date)}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
