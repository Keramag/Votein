import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { metaFor, targets } from "@/lib/exercises";
import { getWorkout, lastSets, workoutPrs } from "@/lib/workouts";
import WorkoutEditor from "@/components/WorkoutEditor";

export const metadata: Metadata = { title: "Workout" };

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const user = await currentUser();
  if (!user || !Number.isInteger(id)) notFound();
  const workout = getWorkout(user.id, id);
  if (!workout) notFound();
  const ids = [...new Set(workout.exercises.map((e) => e.exerciseId))];
  const previous = Object.fromEntries(ids.map((x) => [x, lastSets(user.id, x, id)]));
  return (
    <WorkoutEditor
      workout={workout}
      meta={metaFor(ids)}
      previous={previous}
      prs={workoutPrs(user.id, id)}
      unit={user.unit}
      targets={targets}
    />
  );
}
