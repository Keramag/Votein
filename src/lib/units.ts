export type Unit = "kg" | "lb";
const LB = 2.2046226218;

export const toDisplay = (kg: number, unit: Unit) => {
  const v = unit === "lb" ? kg * LB : kg;
  return Math.round(v * 100) / 100;
};
export const toKg = (v: number, unit: Unit) => (unit === "lb" ? v / LB : v);
export const fmtWeight = (kg: number | null, unit: Unit) =>
  kg === null || kg === 0 ? "BW" : `${toDisplay(kg, unit)} ${unit}`;

export const fmtDate = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
