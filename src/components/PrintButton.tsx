"use client";

export default function PrintButton({ className = "btn" }: { className?: string }) {
  return (
    <button type="button" className={`${className} print:hidden`} onClick={() => window.print()}>
      Print
    </button>
  );
}
