// Muscle groups used for volume targets. Keys match the dataset's `target` field.
export type Category = "push" | "pull" | "legs" | "core";

export type Muscle = {
  key: string;
  label: string;
  cat: Category;
  large: boolean;
  /** default weekly sets for an intermediate lifter */
  def: number;
};

export const MUSCLES: Muscle[] = [
  { key: "pectorals", label: "Chest", cat: "push", large: true, def: 12 },
  { key: "lats", label: "Lats", cat: "pull", large: true, def: 10 },
  { key: "upper back", label: "Upper back", cat: "pull", large: true, def: 10 },
  { key: "delts", label: "Shoulders", cat: "push", large: true, def: 10 },
  { key: "quads", label: "Quads", cat: "legs", large: true, def: 12 },
  { key: "hamstrings", label: "Hamstrings", cat: "legs", large: true, def: 10 },
  { key: "glutes", label: "Glutes", cat: "legs", large: true, def: 10 },
  { key: "biceps", label: "Biceps", cat: "pull", large: false, def: 8 },
  { key: "triceps", label: "Triceps", cat: "push", large: false, def: 8 },
  { key: "calves", label: "Calves", cat: "legs", large: false, def: 8 },
  { key: "abs", label: "Abs", cat: "core", large: false, def: 8 },
  { key: "traps", label: "Traps", cat: "pull", large: false, def: 4 },
  { key: "forearms", label: "Forearms", cat: "pull", large: false, def: 0 },
  { key: "spine", label: "Lower back", cat: "core", large: false, def: 0 },
  { key: "adductors", label: "Adductors", cat: "legs", large: false, def: 0 },
  { key: "abductors", label: "Abductors", cat: "legs", large: false, def: 0 },
];

export const MUSCLE_BY_KEY = new Map(MUSCLES.map((m) => [m.key, m]));

export const muscleLabel = (key: string) =>
  MUSCLE_BY_KEY.get(key)?.label ?? key.replace(/^./, (c) => c.toUpperCase());

/** Maps the dataset's free-form secondary-muscle names onto tracked muscle keys. */
const SECONDARY: Record<string, string> = {
  shoulders: "delts",
  deltoids: "delts",
  "rear deltoids": "delts",
  chest: "pectorals",
  "upper chest": "pectorals",
  quadriceps: "quads",
  core: "abs",
  abdominals: "abs",
  "lower abs": "abs",
  obliques: "abs",
  "lower back": "spine",
  rhomboids: "upper back",
  back: "upper back",
  trapezius: "traps",
  "latissimus dorsi": "lats",
  lats: "lats",
  "inner thighs": "adductors",
  groin: "adductors",
  brachialis: "biceps",
  soleus: "calves",
  "grip muscles": "forearms",
  "wrist flexors": "forearms",
  "wrist extensors": "forearms",
};

export function secondaryMuscles(secondary: string[], primary: string) {
  const out = new Set<string>();
  for (const s of secondary) {
    const k = SECONDARY[s] ?? (MUSCLE_BY_KEY.has(s) ? s : undefined);
    if (k && k !== primary && MUSCLE_BY_KEY.has(k)) out.add(k);
  }
  return [...out];
}

export type EquipmentGroup = { key: string; label: string; values: string[] };

export const EQUIPMENT_GROUPS: EquipmentGroup[] = [
  { key: "body", label: "Bodyweight", values: ["body weight"] },
  { key: "dumbbell", label: "Dumbbells", values: ["dumbbell"] },
  {
    key: "barbell",
    label: "Barbell & plates",
    values: ["barbell", "ez barbell", "olympic barbell", "trap bar", "weighted"],
  },
  { key: "cable", label: "Cable machine", values: ["cable"] },
  {
    key: "machine",
    label: "Machines",
    values: ["leverage machine", "sled machine"],
  },
  { key: "smith", label: "Smith machine", values: ["smith machine"] },
  { key: "kettlebell", label: "Kettlebells", values: ["kettlebell"] },
  { key: "band", label: "Resistance bands", values: ["band", "resistance band"] },
  {
    key: "ball",
    label: "Balls (stability, bosu, medicine)",
    values: ["stability ball", "bosu ball", "medicine ball"],
  },
  { key: "wheel", label: "Ab wheel", values: ["wheel roller"] },
];

export const EQUIPMENT_PRESETS: { label: string; groups: string[] }[] = [
  {
    label: "Full gym",
    groups: ["body", "dumbbell", "barbell", "cable", "machine", "smith", "kettlebell", "band", "ball", "wheel"],
  },
  { label: "Home: dumbbells & bands", groups: ["body", "dumbbell", "band"] },
  { label: "Bodyweight only", groups: ["body"] },
];

export const groupsToValues = (groups: string[]) =>
  EQUIPMENT_GROUPS.filter((g) => groups.includes(g.key)).flatMap((g) => g.values);
