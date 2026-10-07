import type { ExerciseMeta } from "@/lib/exercises";
import { muscleLabel } from "@/lib/muscles";
import { WEEKDAYS, type ProgramDay } from "@/lib/program";

/** Print-only sheet: the week's days plus weekly sets per exercise and per muscle. */
export default function PrintableProgram({
  title,
  subtitle,
  days,
  meta,
}: {
  title: string;
  subtitle?: string;
  days: ProgramDay[];
  meta: Record<string, ExerciseMeta>;
}) {
  const perExercise = new Map<string, number>();
  const perMuscle = new Map<string, number>();
  for (const d of days)
    for (const it of d.items) {
      perExercise.set(it.exerciseId, (perExercise.get(it.exerciseId) ?? 0) + it.sets);
      const t = meta[it.exerciseId]?.target;
      if (t) perMuscle.set(t, (perMuscle.get(t) ?? 0) + it.sets);
    }
  const byCount = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="hidden print:block">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="muted text-sm">{subtitle}</p>}
      <div className="mt-4 space-y-4">
        {days.map((d, i) => (
          <section key={i} className="break-inside-avoid">
            <h2 className="border-b border-stone-400 pb-1 font-semibold">
              {d.weekday !== null && <span className="muted mr-2 font-normal">{WEEKDAYS[d.weekday]}</span>}
              {d.name}
            </h2>
            <table className="mt-1 w-full text-sm">
              <tbody>
                {d.items.map((it, k) => (
                  <tr key={k} className="border-b border-stone-200">
                    <td className="w-6 py-1">☐</td>
                    <td className="py-1 capitalize">{meta[it.exerciseId]?.name ?? it.exerciseId}</td>
                    <td className="py-1 text-right whitespace-nowrap">
                      {it.sets} × {it.reps}
                    </td>
                    <td className="w-28 py-1 pl-3 text-right text-stone-400">______ kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6 break-inside-avoid text-sm">
        <section>
          <h2 className="border-b border-stone-400 pb-1 font-semibold">Exercises per week</h2>
          <ul>
            {byCount(perExercise).map(([id, n]) => (
              <li key={id} className="flex justify-between gap-2 py-0.5">
                <span className="capitalize">{meta[id]?.name ?? id}</span>
                <span>{n} sets</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="border-b border-stone-400 pb-1 font-semibold">Muscles per week</h2>
          <ul>
            {byCount(perMuscle).map(([m, n]) => (
              <li key={m} className="flex justify-between gap-2 py-0.5">
                <span>{muscleLabel(m)}</span>
                <span>{n} sets</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
