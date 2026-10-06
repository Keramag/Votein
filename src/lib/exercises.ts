import data from "@/data/exercises.json";

export type Exercise = {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondary: string[];
  steps: string[];
  image: string;
  gif: string;
};

export const ATTRIBUTION = "© Gym visual — https://gymvisual.com/";

const MEDIA_BASE =
  "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main";

export const imageUrl = (e: Exercise) => `${MEDIA_BASE}/images/${e.image}`;
export const gifUrl = (e: Exercise) => `${MEDIA_BASE}/videos/${e.gif}`;

export const exercises = data as Exercise[];

const uniq = (xs: string[]) => [...new Set(xs)].sort();
export const targets = uniq(exercises.map((e) => e.target));
export const equipmentTypes = uniq(exercises.map((e) => e.equipment));
export const bodyParts = uniq(exercises.map((e) => e.bodyPart));

export const getExercise = (id: string) => exercises.find((e) => e.id === id);

export type Filters = {
  q?: string;
  target?: string;
  equipment?: string;
  bodyPart?: string;
};

export function searchExercises({ q, target, equipment, bodyPart }: Filters) {
  const needle = q?.trim().toLowerCase();
  return exercises.filter(
    (e) =>
      (!needle || e.name.toLowerCase().includes(needle)) &&
      (!target || e.target === target) &&
      (!equipment || e.equipment === equipment) &&
      (!bodyPart || e.bodyPart === bodyPart),
  );
}

const byId = new Map(exercises.map((e) => [e.id, e]));

export type ExerciseMeta = {
  id: string;
  name: string;
  target: string;
  equipment: string;
  image: string;
};

export const toMeta = (e: Exercise): ExerciseMeta => ({
  id: e.id,
  name: e.name,
  target: e.target,
  equipment: e.equipment,
  image: imageUrl(e),
});

/** Meta for the given ids; unknown ids are skipped. */
export function metaFor(ids: Iterable<string>) {
  const out: Record<string, ExerciseMeta> = {};
  for (const id of ids) {
    const e = byId.get(id);
    if (e) out[id] = toMeta(e);
  }
  return out;
}
