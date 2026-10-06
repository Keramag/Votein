import Link from "next/link";
import { notFound } from "next/navigation";
import { ATTRIBUTION, getExercise, gifUrl } from "@/lib/exercises";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const e = getExercise(id);
  if (!e) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <Link href="/exercises" className="text-sm text-zinc-500">
        ← Library
      </Link>
      <h1 className="mt-2 text-2xl font-bold capitalize">{e.name}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gifUrl(e)}
        alt={`${e.name} demonstration`}
        width={180}
        height={180}
        className="my-4 rounded-lg"
      />
      <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <dt className="text-zinc-500">Target</dt>
        <dd className="capitalize">{e.target}</dd>
        <dt className="text-zinc-500">Secondary</dt>
        <dd className="capitalize">{e.secondary.join(", ") || "—"}</dd>
        <dt className="text-zinc-500">Equipment</dt>
        <dd className="capitalize">{e.equipment}</dd>
        <dt className="text-zinc-500">Body part</dt>
        <dd className="capitalize">{e.bodyPart}</dd>
      </dl>
      <h2 className="mb-2 font-semibold">Instructions</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {e.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="mt-8 text-xs text-zinc-500">{ATTRIBUTION}</p>
    </main>
  );
}
