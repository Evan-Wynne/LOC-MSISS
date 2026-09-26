import { CHAIN_MODE, SHOW_MOCK_LABELS } from "@/lib/config";

// Dark strip across the top saying what's real. Mock mode shows it only when
// MOCK labels are switched on (NEXT_PUBLIC_SHOW_PLACEHOLDERS=true).
export function DemoBanner() {
  if (!CHAIN_MODE && !SHOW_MOCK_LABELS) return null;
  const [chip, text] = CHAIN_MODE
    ? ["Solana devnet", "Live on devnet with test tokens. Every action is a real transaction you can open in Solana Explorer."]
    : ["Placeholder data", "This is a UI-only demo. Items marked MOCK are simulated. No wallet is connected and nothing is written to Solana."];
  return (
    <div className="bg-fg px-4 py-2.5 text-[13px] text-bg/95 sm:px-7">
      <span className="mr-3 inline-block rounded-[3px] bg-mock px-2 py-[3px] align-middle font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-mock-ink">
        {chip}
      </span>
      <span className="align-middle">{text}</span>
    </div>
  );
}
