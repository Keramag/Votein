import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { metaFor, targets } from "@/lib/exercises";
import { getSplit } from "@/lib/splits";
import SplitEditor from "@/components/SplitEditor";

export const metadata: Metadata = { title: "Split" };

export default async function SplitPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const user = await currentUser();
  if (!user || !Number.isInteger(id)) notFound();
  const split = getSplit(user.id, id);
  if (!split) notFound();
  const meta = metaFor(split.data.days.flatMap((d) => d.items.map((i) => i.exerciseId)));
  return <SplitEditor id={id} initial={split.data} meta={meta} active={split.active} targets={targets} />;
}
