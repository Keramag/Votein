// Builds src/data/exercises.json (slim, English-only) from the upstream dataset.
// Source: https://github.com/hasaneyldrm/exercises-dataset (media © Gym visual).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SRC = "data/exercises.json";
const URL =
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";

if (!existsSync(SRC)) {
  mkdirSync("data", { recursive: true });
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  writeFileSync(SRC, Buffer.from(await res.arrayBuffer()));
}

const raw = JSON.parse(readFileSync(SRC, "utf8"));
const slim = raw.map((e) => ({
  id: e.id,
  name: e.name,
  bodyPart: e.body_part,
  equipment: e.equipment,
  target: e.target,
  secondary: e.secondary_muscles ?? [],
  steps: e.instruction_steps?.en ?? [],
  image: e.image.replace(/^images\//, ""),
  gif: e.gif_url.replace(/^videos\//, ""),
}));

mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/exercises.json", JSON.stringify(slim));
console.log(`wrote ${slim.length} exercises`);
