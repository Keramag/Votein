import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const SCHEMA = `
create table if not exists users (
  id integer primary key,
  token_hash text not null unique,
  unit text not null default 'kg',
  created_at text not null default current_timestamp
);
create table if not exists workouts (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  date text not null,
  name text not null default '',
  notes text not null default '',
  started_at text not null,
  finished_at text,
  split_id integer,
  day_index integer
);
create index if not exists workouts_user_date on workouts(user_id, date, id);
create table if not exists workout_sets (
  id integer primary key,
  workout_id integer not null references workouts(id) on delete cascade,
  exercise_id text not null,
  position integer not null,
  set_no integer not null,
  weight real,
  reps integer,
  done integer not null default 0,
  target_reps text
);
create index if not exists sets_workout on workout_sets(workout_id);
create index if not exists sets_exercise on workout_sets(exercise_id);
create table if not exists splits (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  name text not null,
  data text not null,
  active integer not null default 0,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp
);
create index if not exists splits_user on splits(user_id);
`;

const g = globalThis as { __voteinDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__voteinDb) {
    const dir = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
    mkdirSync(dir, { recursive: true });
    const d = new DatabaseSync(path.join(dir, "votein.db"));
    d.exec("pragma journal_mode = wal; pragma foreign_keys = on; pragma busy_timeout = 5000;");
    d.exec(SCHEMA);
    g.__voteinDb = d;
  }
  return g.__voteinDb;
}

/** Runs fn in a transaction, rolling back if it throws. */
export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec("begin immediate");
  try {
    const r = fn();
    d.exec("commit");
    return r;
  } catch (e) {
    d.exec("rollback");
    throw e;
  }
}
