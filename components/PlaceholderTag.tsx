import { CHAIN_MODE, SHOW_MOCK_LABELS } from "@/lib/config";

// Small yellow MOCK chip marking values that are fake for now (id in the tooltip).
// Shown only with NEXT_PUBLIC_SHOW_PLACEHOLDERS=true.
const SHOW = SHOW_MOCK_LABELS;

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
      data-placeholder={id}
      className={`inline-flex shrink-0 items-center rounded-[3px] border border-mock-line bg-mock px-[7px] py-px align-middle font-mono text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-mock-ink ${className}`}
    >
      mock
    </span>
  );
}
