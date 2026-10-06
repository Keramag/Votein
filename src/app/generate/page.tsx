import type { Metadata } from "next";
import GenerateForm from "@/components/GenerateForm";

export const metadata: Metadata = { title: "Generate program" };

export default function GeneratePage() {
  return <GenerateForm />;
}
