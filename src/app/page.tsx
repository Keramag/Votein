import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-4xl font-bold">Votein</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Workout tracker, split designer and program generator.
      </p>
      <Link
        href="/exercises"
        className="w-fit rounded bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Browse exercises
      </Link>
    </main>
  );
}
