import type { Metadata } from "next";
import { currentKey, currentUser } from "@/lib/auth";
import SettingsForm from "@/components/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await currentUser();
  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <SettingsForm unit={user?.unit ?? "kg"} syncKey={user ? await currentKey() : null} />
    </main>
  );
}
