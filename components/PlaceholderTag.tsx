import { CHAIN_MODE } from "@/lib/config";

// Small dashed tag marking values that are fake for now.
// Hide all of them for the pitch with NEXT_PUBLIC_SHOW_PLACEHOLDERS=false.
const SHOW = process.env.NEXT_PUBLIC_SHOW_PLACEHOLDERS !== "false";

// Placeholders that become real once chain mode is on (see docs/PLACEHOLDERS.md).
const REAL_IN_CHAIN_MODE = new Set([
  "P1", "P2", "P3", "P4", "P6", "P7", "P8", "P9", "P10",
  "P11", "P13", "P14", "P15", "P16", "P17",
]);

export function PlaceholderTag({ id, className = "" }: { id: string; className?: string }) {
  if (!SHOW) return null;
  if (CHAIN_MODE && REAL_IN_CHAIN_MODE.has(id)) return null;
  return (
    <span
      title={`Placeholder ${id}, see docs/PLACEHOLDERS.md`}
      className={`inline-flex shrink-0 items-center rounded-md border border-dashed border-warn/60 px-1.5 py-px align-middle font-mono text-[10px] font-medium uppercase leading-4 tracking-wide text-warn/90 ${className}`}
    >
      placeholder {id}
    </span>
  );
}
