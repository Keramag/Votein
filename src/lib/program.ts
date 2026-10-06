// Shared shapes for splits (hand-built) and generated programs.
import { z } from "zod";

export const itemSchema = z.object({
  exerciseId: z.string().min(1).max(20),
  sets: z.number().int().min(1).max(20),
  reps: z.string().max(12),
  restSec: z.number().int().min(0).max(900).optional(),
});

export const daySchema = z.object({
  name: z.string().max(60),
  /** 0 = Monday … 6 = Sunday; null when the day isn't tied to a weekday */
  weekday: z.number().int().min(0).max(6).nullable(),
  items: z.array(itemSchema).max(40),
});

export const splitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  days: z.array(daySchema).min(1).max(7),
});

export type ProgramItem = z.infer<typeof itemSchema>;
export type ProgramDay = z.infer<typeof daySchema>;
export type SplitData = z.infer<typeof splitSchema>;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
