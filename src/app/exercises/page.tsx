import Link from "next/link";
import {
  ATTRIBUTION,
  bodyParts,
  equipmentTypes,
  imageUrl,
  searchExercises,
  targets,
} from "@/lib/exercises";

const PAGE_SIZE = 48;

type Params = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

function Select({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: string[];
  value?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      aria-label={label}
      className="rounded border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const sp = await searchParams;
  const filters = {
    q: first(sp.q),
    target: first(sp.target),
    equipment: first(sp.equipment),
    bodyPart: first(sp.bodyPart),
  };
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const results = searchExercises(filters);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const shown = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    params.set("page", String(p));
    return `/exercises?${params}`;
  };

  return (
    <main className="mx-auto w-full max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Exercise library</h1>
      <form className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search…"
          className="col-span-2 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:col-span-2"
        />
        <Select name="target" label="Muscle" options={targets} value={filters.target} />
        <Select name="equipment" label="Equipment" options={equipmentTypes} value={filters.equipment} />
        <Select name="bodyPart" label="Body part" options={bodyParts} value={filters.bodyPart} />
        <button className="col-span-2 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900 sm:col-span-5">
          Apply filters
        </button>
      </form>

      <p className="mb-3 text-sm text-zinc-500">{results.length} exercises</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {shown.map((e) => (
          <li key={e.id}>
            <Link
              href={`/exercises/${e.id}`}
              className="block overflow-hidden rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(e)}
                alt={e.name}
                width={180}
                height={180}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <div className="p-2">
                <p className="truncate text-sm font-medium capitalize">{e.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {e.target} · {e.equipment}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <nav className="mt-6 flex items-center justify-between text-sm">
        {page > 1 ? <Link href={pageHref(page - 1)}>← Prev</Link> : <span />}
        <span className="text-zinc-500">
          Page {page} of {pageCount}
        </span>
        {page < pageCount ? <Link href={pageHref(page + 1)}>Next →</Link> : <span />}
      </nav>
      <p className="mt-8 text-center text-xs text-zinc-500">{ATTRIBUTION}</p>
    </main>
  );
}
