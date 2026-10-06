import { db, tx } from "./db";
import { splitSchema, type SplitData } from "./program";

export type Split = { id: number; name: string; active: boolean; data: SplitData; updatedAt: string };

type Row = { id: number; name: string; active: number; data: string; updated_at: string };

function parse(r: Row): Split {
  const data = splitSchema.parse(JSON.parse(r.data));
  return { id: r.id, name: data.name, active: !!r.active, data, updatedAt: r.updated_at };
}

export function listSplits(userId: number): Split[] {
  return (
    db()
      .prepare("select id, name, active, data, updated_at from splits where user_id = ? order by active desc, updated_at desc, id desc")
      .all(userId) as Row[]
  ).map(parse);
}

export function getSplit(userId: number, id: number): Split | null {
  const r = db()
    .prepare("select id, name, active, data, updated_at from splits where id = ? and user_id = ?")
    .get(id, userId) as Row | undefined;
  return r ? parse(r) : null;
}

export function activeSplit(userId: number): Split | null {
  const r = db()
    .prepare("select id, name, active, data, updated_at from splits where user_id = ? and active = 1")
    .get(userId) as Row | undefined;
  return r ? parse(r) : null;
}

export function createSplit(userId: number, data: SplitData): number {
  return tx(() => {
    const first = !activeSplit(userId);
    const r = db()
      .prepare("insert into splits (user_id, name, data, active) values (?,?,?,?)")
      .run(userId, data.name, JSON.stringify(data), first ? 1 : 0);
    return Number(r.lastInsertRowid);
  });
}

export function updateSplit(userId: number, id: number, data: SplitData) {
  return (
    db()
      .prepare("update splits set name = ?, data = ?, updated_at = current_timestamp where id = ? and user_id = ?")
      .run(data.name, JSON.stringify(data), id, userId).changes > 0
  );
}

export function deleteSplit(userId: number, id: number) {
  return db().prepare("delete from splits where id = ? and user_id = ?").run(id, userId).changes > 0;
}

export function activateSplit(userId: number, id: number) {
  return tx(() => {
    if (!getSplit(userId, id)) return false;
    db().prepare("update splits set active = 0 where user_id = ?").run(userId);
    db().prepare("update splits set active = 1 where id = ?").run(id);
    return true;
  });
}

/** Which day of the active split to suggest for `date` (YYYY-MM-DD). */
export function suggestedDay(userId: number, split: Split, date: string): number | null {
  const days = split.data.days;
  if (!days.length) return null;
  if (days.some((d) => d.weekday !== null)) {
    const wd = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
    const i = days.findIndex((d) => d.weekday === wd);
    return i >= 0 ? i : null; // rest day
  }
  const last = db()
    .prepare("select day_index from workouts where user_id = ? and split_id = ? and day_index is not null order by date desc, id desc limit 1")
    .get(userId, split.id) as { day_index: number } | undefined;
  return last ? (last.day_index + 1) % days.length : 0;
}
