import type { Metadata } from "next";
import SplitEditor from "@/components/SplitEditor";
import { targets } from "@/lib/exercises";

export const metadata: Metadata = { title: "New split" };

export default function NewSplitPage() {
  return (
    <SplitEditor
      initial={{ name: "My split", days: [{ name: "Day 1", weekday: 0, items: [] }] }}
      meta={{}}
      targets={targets}
    />
  );
}
